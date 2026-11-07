import { TrackEvent } from 'livekit-client';

type GateEvent = TrackEvent.Restarted | TrackEvent.Unmuted;

export interface GatedTrack {
  readonly isMuted: boolean;
  readonly mediaStreamTrack: MediaStreamTrack;
  mute: () => Promise<unknown>;
  unmute: () => Promise<unknown>;
  on: (event: GateEvent, listener: () => void) => unknown;
  off: (event: GateEvent, listener: () => void) => unknown;
}

const RESTART_EVENTS: GateEvent[] = [TrackEvent.Restarted, TrackEvent.Unmuted];
const MAX_SYNC_STEPS = 4;

export class MicrophoneGate {
  private keyReady = false;
  private closed = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly track: GatedTrack, private userMuted: boolean, private readonly onError: (error: unknown) => void) {
    RESTART_EVENTS.forEach((event) => track.on(event, this.enforce));
    this.silenceUnlessOpen();
  }

  get open() {
    return !this.closed && this.keyReady && !this.userMuted;
  }

  setMuted(muted: boolean) {
    this.userMuted = muted;
    this.silenceUnlessOpen();
    return this.apply();
  }

  setKeyReady(ready: boolean) {
    this.keyReady = ready;
    this.silenceUnlessOpen();
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
    RESTART_EVENTS.forEach((event) => this.track.off(event, this.enforce));
  }

  private async sync() {
    for (let step = 0; step < MAX_SYNC_STEPS && !this.closed; step += 1) {
      const open = this.open;
      if (open !== this.track.isMuted) break;
      if (open) await this.track.unmute();
      else await this.track.mute();
    }
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
