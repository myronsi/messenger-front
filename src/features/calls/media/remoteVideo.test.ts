import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RosterEntry } from '../model/callState';
import type { VideoFeed } from '../model/videoStore';
import { RemoteVideo, type RemoteVideoPublication, type RemoteVideoTrackLike } from './remoteVideo';

const roster = (...ids: string[]): RosterEntry[] => ids.map((id) => ({ user_id: id, session_id: `s-${id}`, identity_key: `key-${id}` }));

const track = (kind = 'video'): RemoteVideoTrackLike & { attachedElements: HTMLMediaElement[]; getReceiverStats: ReturnType<typeof vi.fn> } => ({
  kind,
  attachedElements: [],
  attach: vi.fn((element: HTMLMediaElement) => element),
  detach: vi.fn(),
  getReceiverStats: vi.fn(async () => ({ framesDecoded: 10 })),
});

const publication = (patch: Partial<Omit<RemoteVideoPublication, 'setSubscribed'>> = {}) => ({
  isEncrypted: true, isMuted: false, source: 'camera', trackSid: 'TR_1', ...patch, setSubscribed: vi.fn<(subscribed: boolean) => void>(),
});

const setup = () => {
  const changes: VideoFeed[][] = [];
  const report = vi.fn();
  const video = new RemoteVideo({ ownIdentity: '1:s-1', onChange: (feeds) => changes.push(feeds), report, freezeCheckMs: 1000 });
  return { video, changes, report, latest: () => changes[changes.length - 1] ?? [] };
};

describe('remote call video', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('lists encrypted camera and screen tracks of people on the roster', () => {
    const { video, latest } = setup();
    video.setRoster(roster('1', '2', '3'));
    video.add(track(), publication(), '2:s-2');
    video.add(track(), publication({ source: 'screen_share', trackSid: 'TR_2' }), '3:s-3');
    video.add(track('audio'), publication({ source: 'microphone', trackSid: 'TR_3' }), '2:s-2');
    expect(latest().map((feed) => [feed.id, feed.source, feed.local])).toEqual([
      ['2:s-2/TR_1', 'camera', false], ['3:s-3/TR_2', 'screen', false],
    ]);
  });

  it('never shows video that is not end-to-end encrypted, not on the roster or the own', () => {
    const { video, latest, report } = setup();
    video.setRoster(roster('1', '2'));
    video.add(track(), publication({ isEncrypted: false }), '2:s-2');
    video.add(track(), publication({ trackSid: 'TR_2' }), '9:s-9');
    video.add(track(), publication({ trackSid: 'TR_3' }), '1:s-1');
    expect(latest()).toEqual([]);
    expect(report).toHaveBeenCalledTimes(3);
    video.refresh();
    expect(report).toHaveBeenCalledTimes(3);
  });

  it('shows a track once its sender joins the roster and hides it when the sender leaves', () => {
    const { video, latest } = setup();
    video.add(track(), publication(), '2:s-2');
    expect(latest()).toEqual([]);
    video.setRoster(roster('1', '2'));
    expect(latest()).toHaveLength(1);
    video.setRoster(roster('1'));
    expect(latest()).toEqual([]);
  });

  it('follows mute changes and keeps the same handle for the same track', () => {
    const { video, latest } = setup();
    video.setRoster(roster('1', '2'));
    const pub = publication();
    video.add(track(), pub, '2:s-2');
    const before = latest()[0];
    Object.assign(pub, { isMuted: true });
    video.refresh();
    const after = latest()[0];
    expect([before.muted, after.muted]).toEqual([false, true]);
    expect(after.handle).toBe(before.handle);
    video.refresh();
    expect(latest()[0]).toBe(after);
  });

  it('drops a track when it is unsubscribed', () => {
    const { video, latest } = setup();
    video.setRoster(roster('1', '2'));
    const camera = track();
    video.add(camera, publication(), '2:s-2');
    video.remove(camera);
    expect(latest()).toEqual([]);
  });

  it('resubscribes to a shown video that stays frozen after the sender key changed', async () => {
    vi.useFakeTimers();
    const { video } = setup();
    video.setRoster(roster('1', '2'));
    const frozen = track();
    frozen.attachedElements.push(document.createElement('video'));
    const pub = publication();
    video.add(frozen, pub, '2:s-2');
    video.keyChanged('2:s-2');
    await vi.advanceTimersByTimeAsync(1000);
    expect(pub.setSubscribed.mock.calls).toEqual([[false], [true]]);
  });

  it('leaves a video alone that keeps decoding or is not shown', async () => {
    vi.useFakeTimers();
    const { video } = setup();
    video.setRoster(roster('1', '2', '3'));
    const playing = track();
    playing.attachedElements.push(document.createElement('video'));
    let frames = 10;
    playing.getReceiverStats.mockImplementation(async () => ({ framesDecoded: frames += 30 }));
    const playingPub = publication();
    video.add(playing, playingPub, '2:s-2');
    const hiddenPub = publication({ trackSid: 'TR_2' });
    video.add(track(), hiddenPub, '3:s-3');
    video.keyChanged('2:s-2');
    video.keyChanged('3:s-3');
    await vi.advanceTimersByTimeAsync(1000);
    expect(playingPub.setSubscribed).not.toHaveBeenCalled();
    expect(hiddenPub.setSubscribed).not.toHaveBeenCalled();
  });
});
