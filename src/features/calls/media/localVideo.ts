import type { TrackPublishOptions } from 'livekit-client';
import { VideoGate, type GatedUpstream } from './videoGate';

export interface PublishableTrack extends GatedUpstream {
  stop: () => void;
}

export interface PublishTarget<T extends PublishableTrack> {
  publishTrack: (track: T, options: TrackPublishOptions) => Promise<unknown>;
  unpublishTrack: (track: T, stopOnUnpublish?: boolean) => Promise<unknown>;
}

type EntryState = 'waiting' | 'publishing' | 'published' | 'removed';

interface Entry {
  options: TrackPublishOptions;
  gate: VideoGate;
  state: EntryState;
  publishing: Promise<void> | null;
}

export class LocalVideoPublisher<T extends PublishableTrack> {
  private readonly entries = new Map<T, Entry>();
  private keyReady = false;

  constructor(private readonly target: PublishTarget<T>, private readonly onError: (track: T, error: unknown) => void) {}

  add(track: T, options: TrackPublishOptions) {
    const gate = new VideoGate(track, this.keyReady, (error) => this.onError(track, error));
    const entry: Entry = { options, gate, state: 'waiting', publishing: null };
    this.entries.set(track, entry);
    if (this.keyReady) this.publish(track, entry);
  }

  has(track: T) {
    return this.entries.has(track);
  }

  isPublished(track: T) {
    return this.entries.get(track)?.state === 'published';
  }

  setKeyReady(ready: boolean) {
    this.keyReady = ready;
    const pending: Promise<void>[] = [];
    this.entries.forEach((entry, track) => {
      pending.push(entry.gate.setKeyReady(ready));
      if (ready && entry.state === 'waiting') this.publish(track, entry);
    });
    return Promise.all(pending).then(() => undefined);
  }

  whenOpen(track: T, action: () => Promise<unknown>) {
    const entry = this.entries.get(track);
    if (!entry) return action().then(() => undefined);
    return entry.gate.whenOpen(action);
  }

  async remove(track: T) {
    const entry = this.entries.get(track);
    if (!entry) return;
    this.entries.delete(track);
    const wasPublished = entry.state !== 'waiting';
    entry.state = 'removed';
    entry.gate.dispose();
    track.mediaStreamTrack.enabled = false;
    try {
      await entry.publishing;
      if (wasPublished) await this.target.unpublishTrack(track, true);
    } catch {
      return;
    } finally {
      track.stop();
    }
  }

  release() {
    this.entries.forEach((entry, track) => {
      entry.state = 'removed';
      entry.gate.dispose();
      track.stop();
    });
    this.entries.clear();
  }

  private publish(track: T, entry: Entry) {
    entry.state = 'publishing';
    entry.publishing = (async () => {
      try {
        await this.target.publishTrack(track, entry.options);
      } catch (error) {
        if (entry.state === 'removed') return;
        this.entries.delete(track);
        entry.state = 'removed';
        entry.gate.dispose();
        track.stop();
        this.onError(track, error);
        return;
      }
      if (entry.state === 'removed') return;
      entry.state = 'published';
      await entry.gate.markPublished();
    })();
  }
}
