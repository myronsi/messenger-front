import type { LocalAudioTrack } from 'livekit-client';
import { callsApi, type CallKeyEnvelopeList } from '../api/callsApi';
import { callErrorCode } from '../api/callErrors';
import { loadOrCreateIdentity } from '../crypto/identity';
import { attachEngine } from './callConnection';
import {
  beginAttempt, currentEngine, ensureCurrent, hangUpLocally, isCurrent, leaveUnjoinedStart, localEndReason, newestStored, ownsCallMedia, postLeave,
  releaseOwnership, runtime, type AttemptTicket,
} from './callRuntime';
import { activeCallForChat, isCallOver } from './callState';
import { acquireMediaOwnership } from './tabOwnership';
import { loadEngine } from './engineLoader';
import { CallFailure, noticeForError } from './errors';
import { callsStore, currentAccount, idleSession, patchSession, sessionStore, type CallSession } from './stores';

export { currentEngine, hangUpLocally, ownsCallMedia };

const BUSY_PHASES = new Set<CallSession['phase']>(['preparing', 'connecting', 'connected', 'reconnecting']);

type Target = { callId: string; chatId?: undefined } | { callId?: undefined; chatId: string };

const leaveAfterFailedJoin = (callId: string, ticket: AttemptTicket) => {
  if (!isCurrent(ticket)) return;
  const { userId, sessionId } = currentAccount();
  const known = callsStore.get().byId[callId];
  const reason = known ? localEndReason(known, userId, sessionId) : null;
  if (reason !== 'moved' && reason !== 'removed') postLeave(callId);
};

const holdOwnership = async (ticket: AttemptTicket) => {
  if (!runtime.ownership) {
    const acquired = await acquireMediaOwnership();
    if (!isCurrent(ticket)) {
      acquired?.release();
      return false;
    }
    runtime.ownership = acquired;
  }
  if (runtime.ownership) return true;
  const { input, output } = sessionStore.get();
  sessionStore.set({ ...idleSession, input, output, otherTab: true });
  return false;
};

const joinOrAskTakeover = async (callId: string, takeover: boolean) => {
  try {
    return await callsApi.join(callId, takeover);
  } catch (error) {
    if (takeover || callErrorCode(error) !== 'already_in_call') throw error;
    const { input, output } = sessionStore.get();
    releaseOwnership();
    sessionStore.set({ ...idleSession, input, output, takeoverCallId: callId });
    return null;
  }
};

const startOrReuse = async (chatId: string | undefined, ticket: AttemptTicket) => {
  if (!chatId) throw new CallFailure('failed');
  const started = await callsApi.start(chatId);
  const call = newestStored(started.call);
  if (started.created) runtime.unjoinedStart = call.id;
  ensureCurrent(ticket);
  patchSession({ callId: call.id, chatId: call.chat_id });
  return call.id;
};

const enterCall = async (target: Target, takeover: boolean) => {
  const { userId, sessionId } = currentAccount();
  const session = sessionStore.get();
  if (!userId || !sessionId || BUSY_PHASES.has(session.phase)) return;
  if (session.callId && session.callId !== target.callId) return;
  const ticket = beginAttempt();
  const chatId = target.callId ? callsStore.get().byId[target.callId]?.chat_id ?? session.chatId : target.chatId;
  patchSession({
    callId: target.callId ?? null, chatId, phase: 'preparing', notice: null, takeoverCallId: null, otherTab: false, encryption: 'pending',
  });
  if (!await holdOwnership(ticket)) return;
  let microphone: LocalAudioTrack | null = null;
  let callId = target.callId ?? null;
  let joined = false;
  try {
    const module = await loadEngine();
    if (!module.encryptionSupported()) throw new CallFailure('unsupported');
    microphone = await module.openMicrophone(sessionStore.get().input);
    const identity = await loadOrCreateIdentity(userId, sessionId);
    await callsApi.setIdentity(identity.publicKey);
    ensureCurrent(ticket);
    callId ??= await startOrReuse(target.chatId, ticket);
    const result = await joinOrAskTakeover(callId, takeover);
    if (!result) {
      microphone.stop();
      microphone = null;
      if (!isCurrent(ticket) || !sessionStore.get().takeoverCallId) leaveUnjoinedStart(callId);
      return;
    }
    joined = true;
    if (runtime.unjoinedStart === callId) runtime.unjoinedStart = null;
    ensureCurrent(ticket);
    const call = newestStored(result.call);
    patchSession({ phase: 'connecting', chatId: call.chat_id });
    const connect = await attachEngine({ module, ticket, call, grant: result.grant, identity, microphone, userId, sessionId });
    microphone = null;
    await connect();
  } catch (error) {
    microphone?.stop();
    leaveUnjoinedStart(callId);
    if (joined && callId) leaveAfterFailedJoin(callId, ticket);
    if (isCurrent(ticket)) await hangUpLocally(noticeForError(error));
  }
};

export const joinCall = (callId: string, takeover = false) => enterCall({ callId }, takeover);

export const followCalls = () => {
  const session = sessionStore.get();
  if (!session.callId || session.phase === 'idle' || session.phase === 'preparing') return;
  const call = callsStore.get().byId[session.callId];
  if (!call) return;
  if (isCallOver(call)) {
    void hangUpLocally('ended');
    return;
  }
  if (session.phase === 'rejoin') return;
  const { userId, sessionId } = currentAccount();
  const reason = localEndReason(call, userId, sessionId);
  if (reason) void hangUpLocally(reason);
  else currentEngine()?.handleCall(call);
};

export const deliverCallKeys = (list: CallKeyEnvelopeList) => {
  if (list.call_id === sessionStore.get().callId) currentEngine()?.handleKeys(list.items);
};

export const catchUpCallKeys = () => {
  void currentEngine()?.catchUpKeys();
};

export const startCall = async (chatId: string) => {
  const session = sessionStore.get();
  if (session.callId || session.phase !== 'idle') return;
  const existing = activeCallForChat(callsStore.get(), chatId);
  await enterCall(existing ? { callId: existing.id } : { chatId }, false);
};

export const leaveCall = async () => {
  const { callId } = sessionStore.get();
  if (!callId) return;
  if (runtime.unjoinedStart === callId) runtime.unjoinedStart = null;
  await hangUpLocally(null);
  await callsApi.leave(callId).catch(() => undefined);
};

export const endCallForEveryone = async () => {
  const { callId } = sessionStore.get();
  if (!callId) return;
  try {
    await callsApi.end(callId);
  } catch (error) {
    patchSession({ notice: noticeForError(error) });
    return;
  }
  await hangUpLocally(null);
};

export const declineCall = async (callId: string) => {
  const { userId } = currentAccount();
  callsStore.update((state) => {
    const call = state.byId[callId];
    if (!call) return state;
    const participants = call.participants.map((participant) => (
      participant.user_id === userId && participant.state === 'ringing' ? { ...participant, state: 'declined' as const } : participant
    ));
    return { byId: { ...state.byId, [callId]: { ...call, participants } } };
  });
  await callsApi.decline(callId).catch(() => undefined);
};

export const rejoinCall = async () => {
  const { callId } = sessionStore.get();
  if (callId) await joinCall(callId);
};

export const confirmTakeover = async () => {
  const callId = sessionStore.get().takeoverCallId;
  if (callId) await joinCall(callId, true);
};
