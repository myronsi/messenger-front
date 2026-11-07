import type { LocalAudioTrack } from 'livekit-client';
import { setCallActive } from '@/shared/lib/callActivity';
import { callsApi, type Call, type CallKeyEnvelopeList } from '../api/callsApi';
import { callErrorCode } from '../api/callErrors';
import type { CallEngine, EngineEvents } from '../media/callEngine';
import { loadOrCreateIdentity } from '../crypto/identity';
import { securityCode } from '../crypto/securityCode';
import { checkKnownIdentities } from '../crypto/trustStore';
import { activeCallForChat, isCallOver, isJoinedWithSession, participantOf, type RosterEntry } from './callState';
import { CallFailure, noticeForError } from './errors';
import { acquireMediaOwnership, type MediaOwnership } from './tabOwnership';
import {
  callsStore, currentAccount, idleSession, patchSession, receiveCall, sessionStore, type CallNotice, type CallSession,
} from './stores';

let engineModule: Promise<typeof import('../media/callEngine')> | null = null;
const loadEngine = () => (engineModule ??= import('../media/callEngine'));
let engine: CallEngine | null = null;
let ownership: MediaOwnership | null = null;
let generation = 0;
let codeEpoch = { callId: '', epoch: -1 };

const BUSY_PHASES = new Set<CallSession['phase']>(['preparing', 'connecting', 'connected', 'reconnecting']);

export const currentEngine = () => engine;
export const ownsCallMedia = () => !!ownership;

const releaseOwnership = () => {
  ownership?.release();
  ownership = null;
  setCallActive(false);
};

export const hangUpLocally = async (notice: CallNotice | null = null) => {
  generation += 1;
  const current = engine;
  engine = null;
  const { input, output, chatId } = sessionStore.get();
  sessionStore.set({ ...idleSession, notice, input, output, chatId: notice ? chatId : null });
  releaseOwnership();
  await current?.dispose().catch(() => undefined);
};

const newestCall = (call: Call) => {
  receiveCall(call);
  const known = callsStore.get().byId[call.id];
  return known && known.version > call.version ? known : call;
};

const onEpoch = async (callId: string, epoch: number, roster: RosterEntry[]) => {
  if (codeEpoch.callId === callId && codeEpoch.epoch > epoch) return;
  codeEpoch = { callId, epoch };
  const { userId } = currentAccount();
  const [groups, changed] = await Promise.all([
    securityCode(callId, epoch, roster).catch(() => null),
    userId ? checkKnownIdentities(userId, roster.filter((entry) => entry.user_id !== userId)).catch(() => []) : Promise.resolve([]),
  ]);
  const session = sessionStore.get();
  if (session.callId !== callId || codeEpoch.callId !== callId || codeEpoch.epoch !== epoch) return;
  const keyChanges = [...new Set([...session.keyChanges, ...changed.map((entry) => entry.user_id)])];
  patchSession({
    code: groups ? { epoch, groups } : null,
    verified: session.code?.epoch === epoch ? session.verified : false,
    keyChanges,
  });
};

const refreshCall = async (callId: string) => {
  try {
    receiveCall(await callsApi.get(callId));
  } catch {
    if (sessionStore.get().callId === callId) await hangUpLocally('removed');
  }
};

const engineEvents = (callId: string, run: number): EngineEvents => ({
  patch: (patch) => { if (run === generation) patchSession(patch); },
  call: (call) => receiveCall(call),
  epoch: (epoch, roster) => {
    if (run !== generation) return;
    if (sessionStore.get().code?.epoch !== epoch) patchSession({ verified: false });
    void onEpoch(callId, epoch, roster);
  },
  lost: (removed) => {
    if (run !== generation) return;
    void (removed ? refreshCall(callId) : recover(callId));
  },
});

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

export const joinCall = async (callId: string, takeover = false) => {
  const { userId, sessionId } = currentAccount();
  const session = sessionStore.get();
  if (!userId || !sessionId || (session.callId && session.callId !== callId)) return;
  if (session.callId === callId && BUSY_PHASES.has(session.phase)) return;
  const run = generation;
  patchSession({
    callId, chatId: callsStore.get().byId[callId]?.chat_id ?? session.chatId, phase: 'preparing', notice: null,
    takeoverCallId: null, otherTab: false, encryption: 'pending',
  });
  if (!ownership) {
    const acquired = await acquireMediaOwnership();
    if (run !== generation) {
      acquired?.release();
      return;
    }
    ownership = acquired;
  }
  if (!ownership) {
    sessionStore.set({ ...idleSession, input: session.input, output: session.output, otherTab: true });
    return;
  }
  setCallActive(true);
  let microphone: LocalAudioTrack | null = null;
  let joined = false;
  try {
    const module = await loadEngine();
    if (!module.encryptionSupported()) throw new CallFailure('unsupported');
    microphone = await module.openMicrophone(sessionStore.get().input);
    const identity = await loadOrCreateIdentity(userId, sessionId);
    await callsApi.setIdentity(identity.publicKey);
    if (run !== generation) throw new CallFailure('failed');
    const result = await joinOrAskTakeover(callId, takeover);
    if (!result) {
      microphone.stop();
      return;
    }
    joined = true;
    if (run !== generation) throw new CallFailure('failed');
    const call = newestCall(result.call);
    patchSession({ phase: 'connecting', chatId: call.chat_id });
    engine = new module.CallEngine({
      call, grant: result.grant, userId, sessionId, identity, microphone, muted: sessionStore.get().muted,
      api: callsApi, events: engineEvents(callId, run),
    });
    microphone = null;
    await engine.connect();
  } catch (error) {
    microphone?.stop();
    if (joined) void callsApi.leave(callId).catch(() => undefined);
    if (run === generation) await hangUpLocally(noticeForError(error));
  }
};

const recover = async (callId: string) => {
  const run = generation;
  const { userId, sessionId } = currentAccount();
  const previous = engine;
  engine = null;
  patchSession({ phase: 'reconnecting' });
  await previous?.dispose().catch(() => undefined);
  let microphone: LocalAudioTrack | null = null;
  try {
    if (!userId || !sessionId) throw new CallFailure('failed');
    const [grant, fetched, module] = await Promise.all([callsApi.grant(callId), callsApi.get(callId), loadEngine()]);
    const call = newestCall(fetched);
    if (run !== generation || isCallOver(call) || !isJoinedWithSession(call, userId, sessionId)) return;
    const identity = await loadOrCreateIdentity(userId, sessionId);
    microphone = await module.openMicrophone(sessionStore.get().input);
    if (run !== generation) throw new CallFailure('failed');
    engine = new module.CallEngine({
      call, grant, userId, sessionId, identity, microphone, muted: sessionStore.get().muted, api: callsApi, events: engineEvents(callId, run),
    });
    microphone = null;
    await engine.connect();
  } catch {
    microphone?.stop();
    if (run !== generation) return;
    const failed = engine;
    engine = null;
    await failed?.dispose().catch(() => undefined);
    patchSession({ phase: 'rejoin' });
  }
};

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
  const me = participantOf(call, userId);
  if (!me || me.state !== 'joined') void hangUpLocally('removed');
  else if (me.session_id !== sessionId) void hangUpLocally('moved');
  else engine?.handleCall(call);
};

export const deliverCallKeys = (list: CallKeyEnvelopeList) => {
  if (list.call_id === sessionStore.get().callId) engine?.handleKeys(list.items);
};

export const catchUpCallKeys = () => {
  void engine?.catchUpKeys();
};

export const startCall = async (chatId: string) => {
  if (sessionStore.get().callId) return;
  const existing = activeCallForChat(callsStore.get(), chatId);
  if (existing) {
    await joinCall(existing.id);
    return;
  }
  patchSession({ chatId, notice: null });
  try {
    const call = await callsApi.start(chatId);
    receiveCall(call);
    await joinCall(call.id);
  } catch (error) {
    patchSession({ notice: noticeForError(error) });
  }
};

export const leaveCall = async () => {
  const { callId } = sessionStore.get();
  if (!callId) return;
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
