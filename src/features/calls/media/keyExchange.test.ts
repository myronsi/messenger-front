import { describe, expect, it, vi } from 'vitest';
import { ApiProblem } from '@/shared/api/problem';
import type { Call, CallKeyEnvelope, SendCallKeys } from '../api/callsApi';
import { exportIdentityKey, generateIdentityKeys, type CallIdentity } from '../crypto/identity';
import { sealSenderKey } from '../crypto/sealing';
import { KeyExchange } from './keyExchange';

const identity = async (): Promise<CallIdentity> => {
  const keys = await generateIdentityKeys();
  return { keys, publicKey: await exportIdentityKey(keys.publicKey) };
};

const callWith = (epoch: number, members: { user: string; session: string; identity: CallIdentity }[]): Call => ({
  id: '10', chat_id: '77', kind: 'group', state: 'active', end_reason: null, initiator_id: '1', created_at: '2026-11-07T10:00:00Z',
  started_at: '2026-11-07T10:00:01Z', ended_at: null, ring_expires_at: '2026-11-07T10:00:30Z', epoch, version: epoch, max_participants: 10,
  participants: members.map((member) => ({
    user_id: member.user, state: 'joined' as const, session_id: member.session, identity_key: member.identity.publicKey, joined_at: null,
  })),
});

const setup = async () => {
  const alice = { user: '1', session: 's-alice', identity: await identity() };
  const bob = { user: '2', session: 's-bob', identity: await identity() };
  const relayed: { sender: string; body: SendCallKeys }[] = [];
  const installed: { owner: string; participant: string; epoch: number; key: number[] }[] = [];
  const backlog = new Map<string, CallKeyEnvelope[]>();
  const exchange = (member: typeof alice) => new KeyExchange({
    callId: '10', userId: member.user, sessionId: member.session, identity: member.identity,
    sink: { setParticipantKey: async (participant, key, epoch) => { installed.push({ owner: member.session, participant, epoch, key: Array.from(key) }); } },
    api: {
      sendKeys: vi.fn(async (_id: string, body: SendCallKeys) => { relayed.push({ sender: member.session, body }); }),
      get: vi.fn(), setIdentity: vi.fn(),
      keys: vi.fn(async () => ({ call_id: '10', epoch: 0, items: backlog.get(member.session) ?? [] })),
    },
    onCall: vi.fn(), onEpoch: vi.fn(), onOwnKey: vi.fn(), onFailure: vi.fn(),
  });
  const delivered = (to: typeof alice, from: typeof alice): CallKeyEnvelope[] => relayed.filter((entry) => entry.sender === from.session)
    .flatMap(({ body }) => body.envelopes.filter((envelope) => envelope.recipient_session_id === to.session).map((envelope) => ({
      ...envelope, epoch: body.epoch, sender_user_id: from.user, sender_session_id: from.session,
    })));
  return { alice, bob, relayed, installed, backlog, exchange, delivered };
};

describe('epoch key exchange', () => {
  it('seals a fresh sender key per epoch, installs it after it was accepted and opens the peer key', async () => {
    const { alice, bob, installed, exchange, delivered } = await setup();
    const a = exchange(alice);
    const b = exchange(bob);
    const call = callWith(3, [alice, bob]);
    await Promise.all([a.handleCall(call), b.handleCall(call)]);
    expect(a.hasOwnKey()).toBe(true);
    await b.handleEnvelopes(delivered(bob, alice));
    const aliceOwn = installed.find((entry) => entry.owner === 's-alice' && entry.participant === '1:s-alice');
    const atBob = installed.find((entry) => entry.owner === 's-bob' && entry.participant === '1:s-alice');
    expect(aliceOwn?.epoch).toBe(3);
    expect(atBob?.key).toEqual(aliceOwn?.key);
    await b.handleCall(callWith(4, [alice, bob]));
    const own = installed.filter((entry) => entry.owner === 's-bob' && entry.participant === '2:s-bob');
    expect(own.map((entry) => entry.epoch)).toEqual([3, 4]);
    expect(own[0].key).not.toEqual(own[1].key);
  });

  it('keeps envelopes of a later epoch until the call update arrives', async () => {
    const { alice, bob, installed, exchange, delivered } = await setup();
    const a = exchange(alice);
    const b = exchange(bob);
    await a.handleCall(callWith(5, [alice, bob]));
    await b.handleEnvelopes(delivered(bob, alice));
    expect(installed.some((entry) => entry.owner === 's-bob' && entry.participant === '1:s-alice')).toBe(false);
    await b.handleCall(callWith(5, [alice, bob]));
    expect(installed.some((entry) => entry.owner === 's-bob' && entry.participant === '1:s-alice' && entry.epoch === 5)).toBe(true);
  });

  it('ignores envelopes from sessions outside the roster or with a mismatching sender', async () => {
    const { alice, bob, installed, exchange } = await setup();
    const mallory = { user: '3', session: 's-mallory', identity: await identity() };
    const b = exchange(bob);
    await b.handleCall(callWith(2, [alice, bob]));
    const forged = await sealSenderKey(new Uint8Array(32), mallory.identity.keys, bob.identity.publicKey, {
      callId: '10', epoch: 2, senderSessionId: 's-alice', recipientSessionId: 's-bob',
    });
    await b.handleEnvelopes([
      { ...forged, epoch: 2, sender_user_id: '1', sender_session_id: 's-alice', recipient_session_id: 's-bob' },
      { ...forged, epoch: 2, sender_user_id: '3', sender_session_id: 's-mallory', recipient_session_id: 's-bob' },
      { ...forged, epoch: 2, sender_user_id: '2', sender_session_id: 's-alice', recipient_session_id: 's-bob' },
    ]);
    expect(installed.filter((entry) => entry.owner === 's-bob' && entry.participant !== '2:s-bob')).toEqual([]);
  });

  it('moves to the fresh epoch itself when the server reports a stale epoch', async () => {
    const { alice, bob } = await setup();
    const fresh = callWith(7, [alice, bob]);
    const onCall = vi.fn();
    const setParticipantKey = vi.fn(async () => undefined);
    const sendKeys = vi.fn(async () => undefined).mockRejectedValueOnce(new ApiProblem(409, { code: 'stale_epoch' }));
    const exchange = new KeyExchange({
      callId: '10', userId: alice.user, sessionId: alice.session, identity: alice.identity, sink: { setParticipantKey },
      api: { sendKeys, get: vi.fn(async () => fresh), setIdentity: vi.fn(), keys: vi.fn(async () => ({ call_id: '10', epoch: 7, items: [] })) },
      onCall, onEpoch: vi.fn(), onOwnKey: vi.fn(), onFailure: vi.fn(),
    });
    await exchange.handleCall(callWith(6, [alice, bob]));
    expect(onCall).toHaveBeenCalledWith(fresh);
    expect(sendKeys.mock.calls.map((args) => (args as unknown[])[1])).toEqual([
      expect.objectContaining({ epoch: 6 }), expect.objectContaining({ epoch: 7 }),
    ]);
    expect(setParticipantKey).toHaveBeenCalledTimes(1);
    expect(setParticipantKey).toHaveBeenCalledWith('1:s-alice', expect.any(Uint8Array), 7);
    expect(exchange.currentEpoch()).toBe(7);
    expect(exchange.hasOwnKey()).toBe(true);
  });

  it('fetches the stored envelopes on a new epoch, so keys missed while the socket was down still arrive', async () => {
    const { alice, bob, installed, backlog, exchange, delivered } = await setup();
    const call = callWith(5, [alice, bob]);
    await exchange(alice).handleCall(call);
    backlog.set(bob.session, delivered(bob, alice));
    await exchange(bob).handleCall(call);
    expect(installed.some((entry) => entry.owner === 's-bob' && entry.participant === '1:s-alice' && entry.epoch === 5)).toBe(true);
  });

  it('reports a failed identity refresh and tries again on the next epoch', async () => {
    const { alice, bob } = await setup();
    const setIdentity = vi.fn(async () => undefined).mockRejectedValueOnce(new Error('offline'));
    const onFailure = vi.fn();
    const exchange = new KeyExchange({
      callId: '10', userId: alice.user, sessionId: alice.session, identity: alice.identity, sink: { setParticipantKey: vi.fn() },
      api: { sendKeys: vi.fn(), get: vi.fn(), setIdentity, keys: vi.fn() },
      onCall: vi.fn(), onEpoch: vi.fn(), onOwnKey: vi.fn(), onFailure,
    });
    const outdated = { ...alice, identity: bob.identity };
    await exchange.handleCall(callWith(2, [outdated, bob]));
    expect(onFailure).toHaveBeenCalledWith(2);
    await exchange.handleCall(callWith(3, [outdated, bob]));
    await exchange.handleCall(callWith(4, [outdated, bob]));
    expect(setIdentity).toHaveBeenCalledTimes(2);
  });
});
