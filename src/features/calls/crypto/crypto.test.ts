import { describe, expect, it } from 'vitest';
import { decodeIdentityKey, fromBase64Url, toBase64Url } from './encoding';
import { exportIdentityKey, generateIdentityKeys } from './identity';
import { envelopeAad, newSenderKey, openSenderKey, sealSenderKey } from './sealing';
import { codeGroups, securityCode, securityCodeInput } from './securityCode';
import { compareIdentities } from './trustStore';

const identity = async () => {
  const keys = await generateIdentityKeys();
  return { keys, publicKey: await exportIdentityKey(keys.publicKey) };
};
const context = { callId: '10', epoch: 4, senderSessionId: 's-alice', recipientSessionId: 's-bob' };

describe('call identity keys', () => {
  it('keeps the private key non-extractable and exports a 65-byte uncompressed point as base64url', async () => {
    const alice = await identity();
    expect(alice.keys.privateKey.extractable).toBe(false);
    expect(alice.publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/);
    expect(decodeIdentityKey(alice.publicKey)[0]).toBe(4);
    expect(() => decodeIdentityKey(toBase64Url(new Uint8Array(64)))).toThrow();
    expect(Array.from(fromBase64Url(toBase64Url(new Uint8Array([251, 255, 0, 1]))))).toEqual([251, 255, 0, 1]);
  });
});

describe('sender key envelopes', () => {
  it('opens a sealed sender key between two identities', async () => {
    const [alice, bob] = await Promise.all([identity(), identity()]);
    const key = newSenderKey();
    const envelope = await sealSenderKey(key, alice.keys, bob.publicKey, context);
    expect(envelope.enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(envelope.ciphertext.length).toBeLessThanOrEqual(256);
    expect(Array.from(await openSenderKey(envelope, bob.keys, alice.publicKey, context))).toEqual(Array.from(key));
    expect(new TextDecoder().decode(envelopeAad(context))).toBe('10|4|s-alice|s-bob');
  });

  it('rejects a wrong AAD, a wrong epoch, a wrong sender and a wrong recipient', async () => {
    const [alice, bob, mallory] = await Promise.all([identity(), identity(), identity()]);
    const envelope = await sealSenderKey(newSenderKey(), alice.keys, bob.publicKey, context);
    await expect(openSenderKey(envelope, bob.keys, alice.publicKey, { ...context, recipientSessionId: 's-other' })).rejects.toThrow();
    await expect(openSenderKey(envelope, bob.keys, alice.publicKey, { ...context, epoch: 5 })).rejects.toThrow();
    await expect(openSenderKey(envelope, bob.keys, mallory.publicKey, context)).rejects.toThrow();
    await expect(openSenderKey(envelope, mallory.keys, alice.publicKey, context)).rejects.toThrow();
    const forged = await sealSenderKey(newSenderKey(), mallory.keys, bob.publicKey, context);
    await expect(openSenderKey(forged, bob.keys, alice.publicKey, context)).rejects.toThrow();
  });
});

describe('security code', () => {
  it('is deterministic, independent of roster order and changes with the epoch or a key', async () => {
    const [alice, bob, other] = await Promise.all([identity(), identity(), identity()]);
    const roster = [
      { user_id: '1', session_id: 's-alice', identity_key: alice.publicKey },
      { user_id: '2', session_id: 's-bob', identity_key: bob.publicKey },
    ];
    const code = await securityCode('10', 4, roster);
    expect(code).toHaveLength(6);
    code.forEach((group) => expect(group).toMatch(/^\d{5}$/));
    expect(await securityCode('10', 4, [...roster].reverse())).toEqual(code);
    expect(await securityCode('10', 5, roster)).not.toEqual(code);
    expect(await securityCode('10', 4, [roster[0], { ...roster[1], identity_key: other.publicKey }])).not.toEqual(code);
    expect((await securityCodeInput('10', 4, roster)).startsWith('messenger-call-code/v1|10|4|1|s-alice|')).toBe(true);
  });

  it('reads six big-endian 32-bit chunks modulo 100000', () => {
    const digest = new Uint8Array(32);
    digest.set([0, 0, 0, 7, 0xff, 0xff, 0xff, 0xff, 0, 1, 0x86, 0xa0]);
    expect(codeGroups(digest)).toEqual(['00007', '67295', '00000', '00000', '00000', '00000']);
  });
});

describe('trust on first use', () => {
  it('remembers identities and reports a changed key of a known session', () => {
    const first = compareIdentities({}, [{ user_id: '2', session_id: 's-bob', identity_key: 'k', fingerprint: 'aa' }]);
    expect(first.changed).toEqual([]);
    const same = compareIdentities(first.known, [{ user_id: '2', session_id: 's-bob', identity_key: 'k', fingerprint: 'aa' }]);
    expect(same.changed).toEqual([]);
    const changed = compareIdentities(first.known, [
      { user_id: '2', session_id: 's-bob', identity_key: 'k2', fingerprint: 'bb' },
      { user_id: '2', session_id: 's-new', identity_key: 'k3', fingerprint: 'cc' },
    ]);
    expect(changed.changed).toEqual([{ user_id: '2', session_id: 's-bob', identity_key: 'k2' }]);
    expect(changed.known).toEqual({ '2:s-bob': 'bb', '2:s-new': 'cc' });
  });
});
