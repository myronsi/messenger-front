import type { LocalAudioTrack } from 'livekit-client';
import { setCallActive } from '@/shared/lib/callActivity';
import { callsApi, type Call, type CallGrant } from '../api/callsApi';
import { callErrorStatus } from '../api/callErrors';
import { loadOrCreateIdentity, type CallIdentity } from '../crypto/identity';
import type { CallEngine, EngineEvents } from '../media/callEngine';
import { onEpoch } from './callSecurity';
import {
  beginAttempt, detachEngine, ensureCurrent, hangUpLocally, isCurrent, localEndReason, newestStored, runtime, type AttemptTicket,
} from './callRuntime';
import { loadEngine, type EngineModule } from './engineLoader';
import { CallFailure } from './errors';
import { callsStore, currentAccount, patchSession, receiveCall, sessionStore } from './stores';

export const RECOVERY_DELAYS_MS = [0, 1000, 3000, 7000];

interface Binding {
  engine: CallEngine | null;
  connected: boolean;
}

export interface EngineStart {
  module: EngineModule;
  ticket: AttemptTicket;
  call: Call;
  grant: CallGrant;
  identity: CallIdentity;
  microphone: LocalAudioTrack;
  userId: string;
  sessionId: string;
}

const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

const settleCall = async (callId: string, otherwise: () => Promise<void> | void) => {
  const { userId, sessionId } = currentAccount();
  try {
    const call = newestStored(await callsApi.get(callId));
    if (sessionStore.get().callId !== callId) return;
    const reason = localEndReason(call, userId, sessionId);
    if (reason) await hangUpLocally(reason);
    else await otherwise();
  } catch {
    if (sessionStore.get().callId === callId) await hangUpLocally('removed');
  }
};

const engineEvents = (callId: string, ticket: AttemptTicket, binding: Binding): EngineEvents => {
  const live = () => !!binding.engine && runtime.engine === binding.engine && ticket.run === runtime.generation;
  return {
    patch: (patch) => { if (live()) patchSession(patch); },
    call: (call) => receiveCall(call),
    epoch: (epoch, roster) => {
      if (!live()) return;
      if (sessionStore.get().code?.epoch !== epoch) patchSession({ verified: false });
      void onEpoch(callId, epoch, roster);
    },
    lost: (removed) => {
      if (!live() || !binding.connected) return;
      binding.connected = false;
      void (removed ? settleCall(callId, () => recover(callId)) : recover(callId));
    },
  };
};

export const attachEngine = async (start: EngineStart) => {
  const { module, ticket, grant, identity, microphone, userId, sessionId } = start;
  await detachEngine();
  ensureCurrent(ticket);
  const callId = start.call.id;
  const binding: Binding = { engine: null, connected: false };
  const engine = new module.CallEngine({
    call: newestStored(start.call), grant, userId, sessionId, identity, microphone, muted: sessionStore.get().muted, api: callsApi,
    events: engineEvents(callId, ticket, binding),
  });
  binding.engine = engine;
  runtime.engine = engine;
  setCallActive(true);
  return async () => {
    await engine.connect();
    ensureCurrent(ticket);
    if (runtime.engine !== engine) throw new CallFailure('failed');
    binding.connected = true;
    const latest = callsStore.get().byId[callId];
    if (latest) engine.handleCall(latest);
  };
};

const reconnectOnce = async (callId: string, ticket: AttemptTicket) => {
  const { userId, sessionId } = currentAccount();
  if (!userId || !sessionId) throw new CallFailure('failed');
  const [grant, fetched, module] = await Promise.all([callsApi.grant(callId), callsApi.get(callId), loadEngine()]);
  const call = newestStored(fetched);
  ensureCurrent(ticket);
  const reason = localEndReason(call, userId, sessionId);
  if (reason) {
    await hangUpLocally(reason);
    return;
  }
  const identity = await loadOrCreateIdentity(userId, sessionId);
  let microphone: LocalAudioTrack | null = await module.openMicrophone(sessionStore.get().input);
  try {
    ensureCurrent(ticket);
    const connect = await attachEngine({ module, ticket, call, grant, identity, microphone, userId, sessionId });
    microphone = null;
    await connect();
  } finally {
    microphone?.stop();
  }
};

const isGone = (error: unknown) => {
  const status = callErrorStatus(error);
  return status === 403 || status === 404;
};

export const recover = async (callId: string) => {
  const ticket = beginAttempt();
  patchSession({ phase: 'reconnecting' });
  await detachEngine();
  for (const delay of RECOVERY_DELAYS_MS) {
    if (delay) await wait(delay);
    if (!isCurrent(ticket)) return;
    try {
      await reconnectOnce(callId, ticket);
      return;
    } catch (error) {
      if (!isCurrent(ticket)) return;
      await detachEngine();
      if (isGone(error)) {
        await settleCall(callId, () => { if (isCurrent(ticket)) patchSession({ phase: 'rejoin' }); });
        return;
      }
    }
  }
  if (isCurrent(ticket)) patchSession({ phase: 'rejoin' });
};
