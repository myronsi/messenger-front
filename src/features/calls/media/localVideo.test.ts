import { describe, expect, it, vi, type Mock } from 'vitest';
import { Track, type TrackPublishOptions } from 'livekit-client';
import { LocalVideoPublisher, type PublishableTrack, type PublishTarget } from './localVideo';

interface FakeTrack extends PublishableTrack {
  isUpstreamPaused: boolean;
  mediaStreamTrack: MediaStreamTrack & { enabled: boolean };
  pauseUpstream: Mock<() => Promise<void>>;
  resumeUpstream: Mock<() => Promise<void>>;
  stop: Mock<() => void>;
  emit: (event: string) => void;
}

const fakeTrack = (): FakeTrack => {
  const listeners = new Map<string, Set<() => void>>();
  const track: FakeTrack = {
    isUpstreamPaused: false,
    mediaStreamTrack: { enabled: true } as MediaStreamTrack & { enabled: boolean },
    pauseUpstream: vi.fn(async () => { track.isUpstreamPaused = true; }),
    resumeUpstream: vi.fn(async () => { track.isUpstreamPaused = false; }),
    stop: vi.fn<() => void>(),
    on: (event, listener) => { listeners.set(event, (listeners.get(event) ?? new Set()).add(listener)); },
    off: (event, listener) => { listeners.get(event)?.delete(listener); },
    emit: (event) => listeners.get(event)?.forEach((listener) => listener()),
  };
  return track;
};

const camera: TrackPublishOptions = { source: Track.Source.Camera };
const screen: TrackPublishOptions = { source: Track.Source.ScreenShare };
const shareAudio: TrackPublishOptions = { source: Track.Source.ScreenShareAudio };

const setup = () => {
  const target = {
    publishTrack: vi.fn(async () => undefined),
    unpublishTrack: vi.fn(async () => undefined),
  } satisfies PublishTarget<FakeTrack>;
  const onError = vi.fn();
  return { target, onError, publisher: new LocalVideoPublisher<FakeTrack>(target, onError) };
};

const settle = () => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

describe('local video publisher', () => {
  it('keeps a camera unpublished and dark until the own key of the epoch is installed', async () => {
    const { target, publisher } = setup();
    const track = fakeTrack();
    publisher.add(track, camera);
    await settle();
    expect(target.publishTrack).not.toHaveBeenCalled();
    expect(track.mediaStreamTrack.enabled).toBe(false);
    await publisher.setKeyReady(true);
    await settle();
    expect(target.publishTrack).toHaveBeenCalledWith(track, camera);
    expect(track.mediaStreamTrack.enabled).toBe(true);
    expect(publisher.isPublished(track)).toBe(true);
  });

  it('gates the screen share and its tab audio the same way', async () => {
    const { target, publisher } = setup();
    const video = fakeTrack();
    const audio = fakeTrack();
    publisher.add(video, screen);
    publisher.add(audio, shareAudio);
    await settle();
    expect(target.publishTrack).not.toHaveBeenCalled();
    await publisher.setKeyReady(true);
    await settle();
    expect(target.publishTrack.mock.calls).toEqual([[video, screen], [audio, shareAudio]]);
  });

  it('publishes at once when the key is already in place', async () => {
    const { target, publisher } = setup();
    await publisher.setKeyReady(true);
    const track = fakeTrack();
    publisher.add(track, camera);
    await settle();
    expect(target.publishTrack).toHaveBeenCalledWith(track, camera);
  });

  it('stops sending at an epoch switch and resumes only with the new key', async () => {
    const { publisher } = setup();
    await publisher.setKeyReady(true);
    const track = fakeTrack();
    publisher.add(track, camera);
    await settle();
    const closing = publisher.setKeyReady(false);
    expect(track.mediaStreamTrack.enabled).toBe(false);
    await closing;
    expect(track.pauseUpstream).toHaveBeenCalledTimes(1);
    expect(track.isUpstreamPaused).toBe(true);
    expect(track.mediaStreamTrack.enabled).toBe(false);
    await publisher.setKeyReady(true);
    expect(track.resumeUpstream).toHaveBeenCalledTimes(1);
    expect(track.mediaStreamTrack.enabled).toBe(true);
  });

  it('silences a track that restarts while the gate is closed', async () => {
    const { publisher } = setup();
    await publisher.setKeyReady(true);
    const track = fakeTrack();
    publisher.add(track, camera);
    await settle();
    await publisher.setKeyReady(false);
    track.isUpstreamPaused = false;
    track.mediaStreamTrack.enabled = true;
    track.emit('restarted');
    expect(track.mediaStreamTrack.enabled).toBe(false);
    await settle();
    expect(track.isUpstreamPaused).toBe(true);
  });

  it('pauses a track whose epoch switched while it was being published', async () => {
    const { target, publisher } = setup();
    await publisher.setKeyReady(true);
    let finish = () => undefined as void;
    target.publishTrack.mockImplementationOnce(() => new Promise<undefined>((resolve) => { finish = () => resolve(undefined); }));
    const track = fakeTrack();
    publisher.add(track, camera);
    await publisher.setKeyReady(false);
    expect(track.mediaStreamTrack.enabled).toBe(false);
    finish();
    await settle();
    expect(track.isUpstreamPaused).toBe(true);
    expect(track.mediaStreamTrack.enabled).toBe(false);
  });

  it('runs a camera switch only while the gate is open', async () => {
    const { publisher } = setup();
    const track = fakeTrack();
    publisher.add(track, camera);
    const flip = vi.fn(async () => undefined);
    await publisher.whenOpen(track, flip);
    expect(flip).not.toHaveBeenCalled();
    await publisher.setKeyReady(true);
    await settle();
    expect(flip).toHaveBeenCalledTimes(1);
  });

  it('drops and stops a track the server refuses', async () => {
    const { target, publisher, onError } = setup();
    const refusal = new Error('not allowed to publish camera');
    target.publishTrack.mockRejectedValueOnce(refusal);
    await publisher.setKeyReady(true);
    const track = fakeTrack();
    publisher.add(track, camera);
    await settle();
    expect(onError).toHaveBeenCalledWith(track, refusal);
    expect(track.stop).toHaveBeenCalled();
    expect(publisher.has(track)).toBe(false);
  });

  it('unpublishes and stops a removed track, also one still waiting for its key', async () => {
    const { target, publisher } = setup();
    const waiting = fakeTrack();
    publisher.add(waiting, camera);
    await publisher.remove(waiting);
    expect(target.unpublishTrack).not.toHaveBeenCalled();
    expect(waiting.stop).toHaveBeenCalled();
    await publisher.setKeyReady(true);
    expect(target.publishTrack).not.toHaveBeenCalled();
    const live = fakeTrack();
    publisher.add(live, screen);
    await publisher.remove(live);
    expect(target.unpublishTrack).toHaveBeenCalledWith(live, true);
    expect(live.stop).toHaveBeenCalled();
  });
});
