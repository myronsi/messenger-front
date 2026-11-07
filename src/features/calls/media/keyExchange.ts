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
  maxRetryDelayMs?: number;
}

const MAX_PENDING = 128;
const MAX_ENVELOPES_PER_REQUEST = 64;

export const participantIdentity = (userId: string, sessionId: string) => `${userId}:${sessionId}`;

export class KeyExchange {
  private rosters = new Map<number, RosterEntry[]>();
  private epoch = -1;
  private ownEpoch = -1;
  private pending: CallKeyEnvelope[] = [];
  private disposed = false;
  private identityRefreshed = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private publishing: number | null = null;
  private attempt = 0;
  private draft: { epoch: number; key: Uint8Array } | null = null;

  constructor(private readonly options: KeyExchangeOptions) {}

  currentEpoch = () => this.epoch;

  hasOwnKey = () => this.epoch >= 0 && this.ownEpoch === this.epoch;

  async handleCall(call: Call) {
    const { callId } = this.options;
    if (this.disposed || call.id !== callId || call.epoch <= this.epoch) return;
    const previous = this.epoch;
    const roster = callRoster(call);
    this.epoch = call.epoch;
    this.rosters.set(call.epoch, roster);
    [...this.rosters.keys()].forEach((epoch) => { if (epoch !== call.epoch && epoch !== previous) this.rosters.delete(epoch); });
    this.stopRetry();
    this.attempt = 0;
    this.options.onEpoch(call.epoch, roster);
    await Promise.all([this.ensureOwnKey(), this.fetchEnvelopes()]);
  }

  async catchUp() {
    await Promise.all([this.ensureOwnKey(), this.fetchEnvelopes()]);
  }

  private async fetchEnvelopes() {
    let items: readonly CallKeyEnvelope[];
    try {
      items = (await this.options.api.keys(this.options.callId)).items;
    } catch {
      items = [];
    }
    await this.handleEnvelopes(items);
  }

  private senderKey(epoch: number) {
    if (this.draft?.epoch !== epoch) {
      this.dropDraft();
      this.draft = { epoch, key: newSenderKey() };
    }
    return this.draft.key;
  }

  private dropDraft() {
    this.draft?.key.fill(0);
    this.draft = null;
  }

  private async ensureOwnKey() {
    const { userId, sessionId, identity } = this.options;
    const epoch = this.epoch;
    const roster = this.rosters.get(epoch);
    if (this.disposed || !roster || this.hasOwnKey() || this.publishing === epoch) return;
    const me = roster.find((entry) => entry.user_id === userId && entry.session_id === sessionId);
    if (!me) return;
    if (me.identity_key !== identity.publicKey) {
      await this.refreshIdentity(epoch);
      return;
    }
    this.stopRetry();
    await this.publishOwnKey(epoch, roster);
  }

  private stopRetry() {
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
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

  private retryDelay() {
    const base = this.options.retryDelayMs ?? 1500;
    return Math.min(base * 2 ** Math.min(this.attempt - 1, 10), this.options.maxRetryDelayMs ?? 30_000);
  }

  private scheduleRetry(epoch: number) {
    if (this.disposed || epoch !== this.epoch) return;
    this.attempt += 1;
    this.options.onFailure(epoch);
    this.stopRetry();
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.ensureOwnKey();
    }, this.retryDelay());
  }

  private async moveToFreshEpoch(epoch: number) {
    const fresh = await this.options.api.get(this.options.callId).catch(() => null);
    if (this.disposed || epoch !== this.epoch) return true;
    if (!fresh || fresh.epoch <= this.epoch) return false;
    this.options.onCall(fresh);
    await this.handleCall(fresh);
    return true;
  }

  private async publishOwnKey(epoch: number, roster: RosterEntry[]) {
    const { callId, userId, sessionId, identity, api, sink } = this.options;
    const key = this.senderKey(epoch);
    this.publishing = epoch;
    let failed = false;
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
      this.attempt = 0;
      this.dropDraft();
      this.options.onOwnKey(epoch);
    } catch (error) {
      if (this.disposed || epoch !== this.epoch) return;
      failed = callErrorCode(error) !== 'stale_epoch';
      if (!failed) {
        if (this.publishing === epoch) this.publishing = null;
        failed = !await this.moveToFreshEpoch(epoch);
      }
    } finally {
      if (this.publishing === epoch) this.publishing = null;
      if (this.draft?.key === key && (this.disposed || epoch !== this.epoch)) this.dropDraft();
    }
    if (failed) this.scheduleRetry(epoch);
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
    this.stopRetry();
    this.dropDraft();
    this.pending = [];
    this.rosters.clear();
  }
}
