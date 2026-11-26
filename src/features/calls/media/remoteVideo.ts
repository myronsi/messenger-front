import type { RosterEntry } from '../model/callState';
import type { VideoFeed, VideoHandle, VideoSource } from '../model/videoStore';
import { participantIdentity } from './keyExchange';

export interface RemoteVideoTrackLike {
  readonly kind: string;
  attach: (element: HTMLMediaElement) => HTMLMediaElement;
  detach: (element: HTMLMediaElement) => unknown;
  readonly attachedElements?: readonly HTMLMediaElement[];
  getReceiverStats?: () => Promise<{ framesDecoded?: number } | undefined>;
}

export interface RemoteVideoPublication {
  readonly isEncrypted: boolean;
  readonly isMuted: boolean;
  readonly source: string;
  readonly trackSid: string;
  setSubscribed?: (subscribed: boolean) => void;
}

type Reporter = (message: string, details: object) => void;

interface Entry {
  identity: string;
  source: VideoSource;
  publication: RemoteVideoPublication;
  handle: VideoHandle;
  feed: VideoFeed | null;
}

export interface RemoteVideoOptions {
  ownIdentity: string;
  onChange: (feeds: VideoFeed[]) => void;
  report?: Reporter;
  freezeCheckMs?: number;
}

const warn: Reporter = (message, details) => console.warn(message, details);

const videoSource = (source: string): VideoSource | null => {
  if (source === 'camera') return 'camera';
  if (source === 'screen_share') return 'screen';
  return null;
};

const framesDecoded = async (track: RemoteVideoTrackLike) => {
  try {
    return (await track.getReceiverStats?.())?.framesDecoded ?? null;
  } catch {
    return null;
  }
};

export class RemoteVideo {
  private readonly entries = new Map<RemoteVideoTrackLike, Entry>();
  private readonly rejected = new Set<RemoteVideoTrackLike>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private roster = new Set<string>();
  private disposed = false;

  constructor(private readonly options: RemoteVideoOptions) {}

  setRoster(entries: readonly RosterEntry[]) {
    this.roster = new Set(entries.map((entry) => participantIdentity(entry.user_id, entry.session_id)));
    this.emit();
  }

  add(track: RemoteVideoTrackLike, publication: RemoteVideoPublication, identity: string) {
    const source = videoSource(publication.source);
    if (track.kind !== 'video' || !source) return;
    this.entries.set(track, {
      identity, source, publication, feed: null,
      handle: { attach: (element) => track.attach(element), detach: (element) => track.detach(element) },
    });
    this.emit();
  }

  remove(track: RemoteVideoTrackLike) {
    this.rejected.delete(track);
    if (this.entries.delete(track)) this.emit();
  }

  refresh() {
    this.emit();
  }

  keyChanged(identity: string) {
    if (this.disposed) return;
    [...this.entries].filter(([, entry]) => entry.identity === identity).forEach(([track, entry]) => { void this.watchFrames(track, entry); });
  }

  feeds() {
    return [...this.entries].flatMap(([track, entry]) => (this.allowed(track, entry) && entry.feed ? [entry.feed] : []));
  }

  dispose() {
    this.disposed = true;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.entries.clear();
    this.rejected.clear();
  }

  private allowed(track: RemoteVideoTrackLike, entry: Entry) {
    const ok = entry.publication.isEncrypted && entry.identity !== this.options.ownIdentity && this.roster.has(entry.identity);
    if (ok) {
      this.rejected.delete(track);
      return true;
    }
    if (!this.rejected.has(track)) {
      this.rejected.add(track);
      (this.options.report ?? warn)('Ignoring call video that is not end-to-end encrypted or not on the roster', {
        participant: entry.identity, encrypted: entry.publication.isEncrypted,
      });
    }
    return false;
  }

  private emit() {
    if (this.disposed) return;
    this.entries.forEach((entry) => {
      const muted = entry.publication.isMuted;
      if (entry.feed?.muted === muted) return;
      entry.feed = {
        id: `${entry.identity}/${entry.publication.trackSid}`, identity: entry.identity, source: entry.source, local: false, muted, mirrored: false,
        handle: entry.handle,
      };
    });
    this.options.onChange(this.feeds());
  }

  private async watchFrames(track: RemoteVideoTrackLike, entry: Entry) {
    const before = await framesDecoded(track);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, this.options.freezeCheckMs ?? 1500);
      this.timers.add(timer);
    });
    if (this.disposed || this.entries.get(track) !== entry || entry.publication.isMuted || !track.attachedElements?.length) return;
    const after = await framesDecoded(track);
    if (before === null || after === null || after > before || this.disposed || this.entries.get(track) !== entry) return;
    entry.publication.setSubscribed?.(false);
    entry.publication.setSubscribed?.(true);
  }
}
