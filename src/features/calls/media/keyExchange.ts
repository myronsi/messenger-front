import type { Call, CallKeyEnvelope, CallsApi } from '../api/callsApi';
import { callErrorCode } from '../api/callErrors';
import { callRoster, type RosterEntry } from '../model/callState';
import type { CallIdentity } from '../crypto/identity';
import { newSenderKey, openSenderKey, sealSenderKey } from '../crypto/sealing';

export interface KeySink {
  setParticipantKey: (participantIdentity: string, key: Uint8Array, epoch: number) => Promise<void>;
}

export interface KeyExchangeOptions {
  callId: string;
  userId: string;
  sessionId: string;
  identity: CallIdentity;
  sink: KeySink;
  api: Pick<CallsApi, 'sendKeys' | 'get' | 'setIdentity' | 'keys'>;
  onCall: (call: Call) => void;
  onEpoch: (epoch: number, roster: RosterEntry[]) => void;
  onOwnKey: (epoch: number) => void;
  onFailure: (epoch: number) => void;
  retryDelayMs?: number;
}

const MAX_PENDING = 128;
const MAX_ENVELOPES_PER_REQUEST = 64;
const MAX_ATTEMPTS = 3;

export const participantIdentity = (userId: string, sessionId: string) => `${userId}:${sessionId}`;

export class KeyExchange {
  private rosters = new Map<number, RosterEntry[]>();
  private epoch = -1;
  private ownEpoch = -1;
  private pending: CallKeyEnvelope[] = [];
  private disposed = false;
  private identityRefreshed = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly options: KeyExchangeOptions) {}

  currentEpoch = () => this.epoch;

  hasOwnKey = () => this.epoch >= 0 && this.ownEpoch === this.epoch;

  async handleCall(call: Call) {
    const { callId, userId, sessionId, identity } = this.options;
    if (this.disposed || call.id !== callId || call.epoch <= this.epoch) return;
    const previous = this.epoch;
    const roster = callRoster(call);
    this.epoch = call.epoch;
    this.rosters.set(call.epoch, roster);
    [...this.rosters.keys()].forEach((epoch) => { if (epoch !== call.epoch && epoch !== previous) this.rosters.delete(epoch); });
    clearTimeout(this.retryTimer);
    this.options.onEpoch(call.epoch, roster);
    const me = roster.find((entry) => entry.user_id === userId && entry.session_id === sessionId);
    if (!me) return;
    if (me.identity_key !== identity.publicKey) {
      await this.refreshIdentity(call.epoch);
      return;
    }
    await Promise.all([this.publishOwnKey(call.epoch, roster, 1), this.catchUp()]);
  }

  async catchUp() {
    const list = await this.options.api.keys(this.options.callId).catch(() => null);
    await this.handleEnvelopes(list?.items ?? []);
  }

  private async refreshIdentity(epoch: number) {
    if (this.identityRefreshed) return;
    this.identityRefreshed = true;
    try {
      await this.options.api.setIdentity(this.options.identity.publicKey);
    } catch {
      this.identityRefreshed = false;
      if (!this.disposed && epoch === this.epoch) this.options.onFailure(epoch);
    }
  }

  private async publishOwnKey(epoch: number, roster: RosterEntry[], attempt: number) {
    const { callId, userId, sessionId, identity, api, sink } = this.options;
    const key = newSenderKey();
    try {
      const envelopes = await Promise.all(roster.filter((entry) => entry.session_id !== sessionId).map(async (recipient) => ({
        recipient_session_id: recipient.session_id,
        ...await sealSenderKey(key, identity.keys, recipient.identity_key, {
          callId, epoch, senderSessionId: sessionId, recipientSessionId: recipient.session_id,
        }),
      })));
      for (let start = 0; start < envelopes.length; start += MAX_ENVELOPES_PER_REQUEST) {
        await api.sendKeys(callId, { epoch, envelopes: envelopes.slice(start, start + MAX_ENVELOPES_PER_REQUEST) });
      }
      if (this.disposed || epoch !== this.epoch) return;
      await sink.setParticipantKey(participantIdentity(userId, sessionId), key, epoch);
      if (this.disposed || epoch !== this.epoch) return;
      this.ownEpoch = epoch;
      this.options.onOwnKey(epoch);
    } catch (error) {
      if (this.disposed || epoch !== this.epoch) return;
      if (callErrorCode(error) === 'stale_epoch') {
        const fresh = await api.get(callId).catch(() => null);
        if (!fresh || this.disposed) return;
        this.options.onCall(fresh);
        await this.handleCall(fresh);
        return;
      }
      this.options.onFailure(epoch);
      if (attempt < MAX_ATTEMPTS) {
        this.retryTimer = setTimeout(() => { void this.publishOwnKey(epoch, roster, attempt + 1); }, (this.options.retryDelayMs ?? 1500) * attempt);
      }
    } finally {
      key.fill(0);
    }
  }

  async handleEnvelopes(items: readonly CallKeyEnvelope[]) {
    if (this.disposed) return;
    const queue = [...this.pending, ...items];
    this.pending = [];
    for (const envelope of queue) {
      if (envelope.recipient_session_id !== this.options.sessionId) continue;
      if (envelope.epoch > this.epoch) {
        this.pending.push(envelope);
        continue;
      }
      await this.openEnvelope(envelope);
      if (this.disposed) return;
    }
    this.pending = this.pending.slice(-MAX_PENDING);
  }

  private async openEnvelope(envelope: CallKeyEnvelope) {
    const { callId, sessionId, identity, sink } = this.options;
    const sender = this.rosters.get(envelope.epoch)?.find((entry) => (
      entry.session_id === envelope.sender_session_id && entry.user_id === envelope.sender_user_id && entry.session_id !== sessionId
    ));
    if (!sender) return false;
    try {
      const key = await openSenderKey(envelope, identity.keys, sender.identity_key, {
        callId, epoch: envelope.epoch, senderSessionId: sender.session_id, recipientSessionId: sessionId,
      });
      try {
        if (!this.disposed) await sink.setParticipantKey(participantIdentity(sender.user_id, sender.session_id), key, envelope.epoch);
      } finally {
        key.fill(0);
      }
      return true;
    } catch {
      return false;
    }
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.retryTimer);
    this.pending = [];
    this.rosters.clear();
  }
}
