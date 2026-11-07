import { setCallActive } from '@/shared/lib/callActivity';
import { callsApi, type Call } from '../api/callsApi';
import type { CallEngine } from '../media/callEngine';
import { isCallOver, participantOf } from './callState';
import { CallFailure } from './errors';
import type { MediaOwnership } from './tabOwnership';
import { callsStore, idleSession, receiveCall, sessionStore, type CallNotice } from './stores';

export interface AttemptTicket {
  run: number;
  token: number;
}

export const runtime = {
  engine: null as CallEngine | null,
  ownership: null as MediaOwnership | null,
  generation: 0,
  attempt: 0,
  unjoinedStart: null as string | null,
};

export const currentEngine = () => runtime.engine;
export const ownsCallMedia = () => !!runtime.ownership;

export const beginAttempt = (): AttemptTicket => {
  runtime.attempt += 1;
  return { run: runtime.generation, token: runtime.attempt };
};

export const isCurrent = (ticket: AttemptTicket) => ticket.run === runtime.generation && ticket.token === runtime.attempt;

export const ensureCurrent = (ticket: AttemptTicket) => {
  if (!isCurrent(ticket)) throw new CallFailure('failed');
};

export const releaseOwnership = () => {
  runtime.ownership?.release();
  runtime.ownership = null;
  setCallActive(false);
};

export const detachEngine = async () => {
  const current = runtime.engine;
  runtime.engine = null;
  await current?.dispose().catch(() => undefined);
};

export const hangUpLocally = async (notice: CallNotice | null = null) => {
  runtime.generation += 1;
  const current = runtime.engine;
  runtime.engine = null;
  const { input, output, chatId } = sessionStore.get();
  sessionStore.set({ ...idleSession, notice, input, output, chatId: notice ? chatId : null });
  releaseOwnership();
  await current?.dispose().catch(() => undefined);
};

export const newestStored = (call: Call) => {
  receiveCall(call);
  const known = callsStore.get().byId[call.id];
  return known && known.version > call.version ? known : call;
};

export const localEndReason = (call: Call, userId: string | null, sessionId: string | null): CallNotice | null => {
  if (isCallOver(call)) return 'ended';
  const me = participantOf(call, userId);
  if (!me || me.state !== 'joined') return 'removed';
  return me.session_id === sessionId ? null : 'moved';
};

export const postLeave = (callId: string) => { void callsApi.leave(callId).catch(() => undefined); };

export const leaveUnjoinedStart = (callId: string | null) => {
  if (!callId || runtime.unjoinedStart !== callId) return;
  runtime.unjoinedStart = null;
  postLeave(callId);
};
