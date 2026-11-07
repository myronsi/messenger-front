import { describe, expect, it } from 'vitest';
import type { Call } from '../api/callsApi';
import {
  activeCallForChat, applyCall, applyCalls, callRoster, emptyCallsState, isJoinedWithSession, pruneEndedCalls, ringingCalls,
} from './callState';
import { canEndForEveryone } from './permissions';

const KEY = `B${'A'.repeat(86)}`;
const call = (overrides: Partial<Call> = {}): Call => ({
  id: '10', chat_id: '77', kind: 'direct', state: 'ringing', end_reason: null, initiator_id: '1', created_at: '2026-11-07T10:00:00Z',
  started_at: null, ended_at: null, ring_expires_at: '2026-11-07T10:00:30Z', epoch: 1, version: 1, max_participants: 10,
  participants: [
    { user_id: '1', state: 'joined', session_id: 's-1', identity_key: KEY, joined_at: '2026-11-07T10:00:01Z' },
    { user_id: '2', state: 'ringing', session_id: null, identity_key: null, joined_at: null },
  ],
  ...overrides,
});
const now = Date.parse('2026-11-07T10:00:10Z');

describe('call state', () => {
  it('keeps the call with the highest version', () => {
    const newer = call({ version: 3, state: 'active' });
    let state = applyCall(emptyCallsState, newer);
    state = applyCall(state, call({ version: 2 }));
    expect(state.byId['10']).toBe(newer);
    expect(applyCall(state, call({ version: 3 }))).toBe(state);
    state = applyCalls(state, [call({ version: 4, state: 'ended' }), call({ id: '11', chat_id: '78' })]);
    expect(state.byId['10'].state).toBe('ended');
    expect(Object.keys(state.byId)).toEqual(['10', '11']);
  });

  it('finds the running call of a chat and ignores ended ones', () => {
    const state = applyCalls(emptyCallsState, [call({ id: '9', state: 'ended', version: 9 }), call({ id: '10', state: 'active' })]);
    expect(activeCallForChat(state, '77')?.id).toBe('10');
    expect(activeCallForChat(state, '78')).toBeNull();
    expect(activeCallForChat(applyCall(state, call({ id: '10', state: 'ended', version: 5 })), '77')).toBeNull();
  });

  it('lists calls that ring this user until they expire', () => {
    const state = applyCall(emptyCallsState, call());
    expect(ringingCalls(state, '2', now).map((item) => item.id)).toEqual(['10']);
    expect(ringingCalls(state, '1', now)).toEqual([]);
    expect(ringingCalls(state, '2', Date.parse('2026-11-07T10:00:31Z'))).toEqual([]);
    const declined = call({ version: 2, participants: [call().participants[0], { ...call().participants[1], state: 'declined' }] });
    expect(ringingCalls(applyCall(state, declined), '2', now)).toEqual([]);
  });

  it('builds the roster from joined sessions with identity keys only', () => {
    expect(callRoster(call())).toEqual([{ user_id: '1', session_id: 's-1', identity_key: KEY }]);
    expect(isJoinedWithSession(call(), '1', 's-1')).toBe(true);
    expect(isJoinedWithSession(call(), '1', 's-2')).toBe(false);
    expect(isJoinedWithSession(call(), '2', 's-1')).toBe(false);
  });

  it('forgets ended calls after a short time', () => {
    const state = applyCall(emptyCallsState, call({ state: 'ended', ended_at: '2026-11-07T10:00:00Z' }));
    expect(pruneEndedCalls(state, Date.parse('2026-11-07T10:00:05Z'))).toBe(state);
    expect(pruneEndedCalls(state, Date.parse('2026-11-07T10:00:20Z')).byId).toEqual({});
  });
});

describe('who may end a call for everyone', () => {
  it('allows the initiator and both members of a direct call', () => {
    expect(canEndForEveryone(call(), '1')).toBe(true);
    expect(canEndForEveryone(call(), '2')).toBe(true);
    expect(canEndForEveryone(call(), '3')).toBe(false);
    expect(canEndForEveryone(call(), null)).toBe(false);
  });

  it('allows the initiator and group owners, admins and moderators', () => {
    const group = call({ kind: 'group' });
    expect(canEndForEveryone(group, '1', 'member')).toBe(true);
    expect(canEndForEveryone(group, '2', 'member')).toBe(false);
    expect(canEndForEveryone(group, '2', null)).toBe(false);
    for (const role of ['owner', 'admin', 'moderator']) expect(canEndForEveryone(group, '5', role)).toBe(true);
  });
});
