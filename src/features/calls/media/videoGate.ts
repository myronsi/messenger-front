import { TrackEvent } from 'livekit-client';

export interface GatedUpstream {
  readonly mediaStreamTrack: MediaStreamTrack;
  readonly isUpstreamPaused: boolean;
  pauseUpstream: () => Promise<unknown>;
  resumeUpstream: () => Promise<unknown>;
  on: (event: TrackEvent.Restarted, listener: () => void) => unknown;
  off: (event: TrackEvent.Restarted, listener: () => void) => unknown;
}

type Action = () => Promise<unknown>;

const MAX_SYNC_STEPS = 4;

export class VideoGate {
  private published = false;
  private closed = false;
  private deferred: Action[] = [];
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly track: GatedUpstream, private keyReady: boolean, private readonly onError: (error: unknown) => void) {
    track.on(TrackEvent.Restarted, this.enforce);
    this.silenceUnlessOpen();
  }

  get open() {
    return !this.closed && this.keyReady;
  }

  setKeyReady(ready: boolean) {
    this.keyReady = ready;
    this.silenceUnlessOpen();
    return this.apply();
  }

  markPublished() {
    this.published = true;
    this.silenceUnlessOpen();
    return this.apply();
  }

  whenOpen(action: Action) {
    this.deferred.push(action);
    return this.apply();
  }

  apply() {
    this.queue = this.queue.then(() => this.sync()).catch((error: unknown) => {
      this.silenceUnlessOpen();
      if (!this.closed) this.onError(error);
    });
    return this.queue;
  }

  dispose() {
    this.closed = true;
    this.deferred = [];
    this.track.off(TrackEvent.Restarted, this.enforce);
  }

  private async sync() {
    for (let step = 0; step < MAX_SYNC_STEPS && !this.closed && this.published; step += 1) {
      const open = this.open;
      if (open !== this.track.isUpstreamPaused) break;
      if (open) await this.track.resumeUpstream();
      else await this.track.pauseUpstream();
    }
    while (this.open && this.deferred.length > 0) {
      const action = this.deferred.shift();
      await action?.();
    }
    if (this.open && (!this.published || !this.track.isUpstreamPaused)) this.track.mediaStreamTrack.enabled = true;
    this.silenceUnlessOpen();
  }

  private silenceUnlessOpen() {
    if (!this.open) this.track.mediaStreamTrack.enabled = false;
  }

  private enforce = () => {
    if (this.open) return;
    this.silenceUnlessOpen();
    void this.apply();
  };
}
