import { BaseKeyProvider, createKeyMaterialFromBuffer } from 'livekit-client';

export const KEYRING_SIZE = 16;

export const keyIndexForEpoch = (epoch: number) => epoch % KEYRING_SIZE;

export class CallKeyProvider extends BaseKeyProvider {
  constructor() {
    super({ sharedKey: false, ratchetWindowSize: 0, keyringSize: KEYRING_SIZE });
  }

  async setParticipantKey(participantIdentity: string, key: Uint8Array, epoch: number) {
    const material = await createKeyMaterialFromBuffer(key.slice().buffer);
    this.onSetEncryptionKey(material, participantIdentity, keyIndexForEpoch(epoch));
  }
}
