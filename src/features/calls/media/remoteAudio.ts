import type { RosterEntry } from '../model/callState';
import { participantIdentity } from './keyExchange';

export interface RemoteAudioTrack {
  readonly kind: string;
  attach: () => HTMLMediaElement;
  detach: (element: HTMLMediaElement) => unknown;
}

export interface RemoteAudioSource {
  readonly isEncrypted: boolean;
}

type Reporter = (message: string, details: object) => void;

const warn: Reporter = (message, details) => console.warn(message, details);

interface Subscription {
  identity: string;
  encrypted: boolean;
}

export class RemoteAudio {
  private readonly container = document.createElement('div');
  private readonly subscriptions = new Map<RemoteAudioTrack, Subscription>();
  private readonly elements = new Map<RemoteAudioTrack, HTMLMediaElement>();
  private readonly rejected = new Set<RemoteAudioTrack>();
  private roster = new Set<string>();

  constructor(private readonly ownIdentity: string, private readonly report: Reporter = warn) {
    this.container.hidden = true;
    this.container.dataset.callAudio = 'true';
    document.body.appendChild(this.container);
  }

  setRoster(entries: readonly RosterEntry[]) {
    this.roster = new Set(entries.map((entry) => participantIdentity(entry.user_id, entry.session_id)));
    this.subscriptions.forEach((_subscription, track) => this.sync(track));
  }

  add(track: RemoteAudioTrack, source: RemoteAudioSource, identity: string) {
    if (track.kind !== 'audio') return;
    this.subscriptions.set(track, { identity, encrypted: source.isEncrypted });
    this.sync(track);
  }

  remove(track: RemoteAudioTrack) {
    this.subscriptions.delete(track);
    this.rejected.delete(track);
    this.detach(track);
  }

  attachedCount() {
    return this.elements.size;
  }

  dispose() {
    [...this.elements.keys()].forEach((track) => this.detach(track));
    this.subscriptions.clear();
    this.rejected.clear();
    this.container.remove();
  }

  private allowed({ identity, encrypted }: Subscription) {
    return encrypted && identity !== this.ownIdentity && this.roster.has(identity);
  }

  private sync(track: RemoteAudioTrack) {
    const subscription = this.subscriptions.get(track);
    if (subscription && this.allowed(subscription)) {
      this.rejected.delete(track);
      this.attach(track);
      return;
    }
    this.detach(track);
    if (!subscription || this.rejected.has(track)) return;
    this.rejected.add(track);
    this.report('Ignoring call audio that is not end-to-end encrypted or not on the roster', {
      participant: subscription.identity, encrypted: subscription.encrypted,
    });
  }

  private attach(track: RemoteAudioTrack) {
    if (this.elements.has(track)) return;
    const element = track.attach();
    this.elements.set(track, element);
    this.container.appendChild(element);
  }

  private detach(track: RemoteAudioTrack) {
    const element = this.elements.get(track);
    if (!element) return;
    this.elements.delete(track);
    track.detach(element);
    element.srcObject = null;
    element.remove();
  }
}
