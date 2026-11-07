import type { Call, CallParticipant } from '../api/callsApi';

export interface CallsState {
  byId: Record<string, Call>;
}

export const emptyCallsState: CallsState = { byId: {} };

export const ENDED_CALL_RETENTION_MS = 10_000;

export const applyCall = (state: CallsState, call: Call): CallsState => {
  const known = state.byId[call.id];
  if (known && known.version >= call.version) return state;
  return { byId: { ...state.byId, [call.id]: call } };
};

export const applyCalls = (state: CallsState, calls: readonly Call[]) => calls.reduce(applyCall, state);

export const pruneEndedCalls = (state: CallsState, now: number, keepMs = ENDED_CALL_RETENTION_MS): CallsState => {
  const stale = Object.values(state.byId).filter((call) => call.state === 'ended' && now - Date.parse(call.ended_at ?? call.created_at) > keepMs);
  if (!stale.length) return state;
  const byId = { ...state.byId };
  stale.forEach((call) => { delete byId[call.id]; });
  return { byId };
};

export const isCallOver = (call: Pick<Call, 'state'>) => call.state === 'ended';

export const participantOf = (call: Pick<Call, 'participants'>, userId: string | null | undefined): CallParticipant | undefined => (
  userId ? call.participants.find((participant) => participant.user_id === userId) : undefined
);

export const joinedParticipants = (call: Pick<Call, 'participants'>) => call.participants.filter((participant) => participant.state === 'joined');

export interface RosterEntry {
  user_id: string;
  session_id: string;
  identity_key: string;
}

export const callRoster = (call: Pick<Call, 'participants'>): RosterEntry[] => call.participants.flatMap((participant) => (
  participant.state === 'joined' && participant.session_id && participant.identity_key
    ? [{ user_id: participant.user_id, session_id: participant.session_id, identity_key: participant.identity_key }]
    : []
));

export const activeCallForChat = (state: CallsState, chatId: string | null | undefined) => (
  chatId ? Object.values(state.byId).filter((call) => call.chat_id === chatId && !isCallOver(call))
    .sort((a, b) => b.version - a.version)[0] ?? null : null
);

export const isRingingFor = (call: Call, userId: string | null | undefined, now: number) => (
  !isCallOver(call) && Date.parse(call.ring_expires_at) > now && participantOf(call, userId)?.state === 'ringing'
);

export const ringingCalls = (state: CallsState, userId: string | null | undefined, now: number) => Object.values(state.byId)
  .filter((call) => isRingingFor(call, userId, now))
  .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

export const isJoinedWithSession = (call: Call, userId: string | null | undefined, sessionId: string | null | undefined) => {
  const me = participantOf(call, userId);
  return !!me && me.state === 'joined' && !!sessionId && me.session_id === sessionId;
};
