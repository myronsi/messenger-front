import { Aes128Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from '@hpke/core';
import { decodeIdentityKey, fromBase64Url, toBase64Url, utf8 } from './encoding';

export const CALL_KEY_INFO = 'messenger-call-key/v1';
export const SENDER_KEY_BYTES = 32;

const suite = new CipherSuite({ kem: new DhkemP256HkdfSha256(), kdf: new HkdfSha256(), aead: new Aes128Gcm() });
const info = utf8(CALL_KEY_INFO);

export interface EnvelopeContext {
  callId: string;
  epoch: number;
  senderSessionId: string;
  recipientSessionId: string;
}

export const envelopeAad = ({ callId, epoch, senderSessionId, recipientSessionId }: EnvelopeContext) => (
  utf8(`${callId}|${epoch}|${senderSessionId}|${recipientSessionId}`)
);

export const importIdentityKey = (identityKey: string) => suite.kem.deserializePublicKey(decodeIdentityKey(identityKey));

export const newSenderKey = () => crypto.getRandomValues(new Uint8Array(SENDER_KEY_BYTES));

export const sealSenderKey = async (
  senderKey: Uint8Array, sender: CryptoKeyPair, recipientIdentityKey: string, context: EnvelopeContext,
) => {
  const recipientPublicKey = await importIdentityKey(recipientIdentityKey);
  const sealed = await suite.seal({ recipientPublicKey, senderKey: sender, info }, senderKey, envelopeAad(context));
  return { enc: toBase64Url(new Uint8Array(sealed.enc)), ciphertext: toBase64Url(new Uint8Array(sealed.ct)) };
};

export const openSenderKey = async (
  envelope: { enc: string; ciphertext: string }, recipient: CryptoKeyPair, senderIdentityKey: string, context: EnvelopeContext,
) => {
  const senderPublicKey = await importIdentityKey(senderIdentityKey);
  const opened = new Uint8Array(await suite.open({
    recipientKey: recipient, enc: fromBase64Url(envelope.enc), senderPublicKey, info,
  }, fromBase64Url(envelope.ciphertext), envelopeAad(context)));
  if (opened.length !== SENDER_KEY_BYTES) throw new Error('Unexpected sender key length');
  return opened;
};
