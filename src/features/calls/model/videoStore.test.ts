import { beforeEach, describe, expect, it } from 'vitest';
import { chooseShare, emptyVideoState, pinTile, resetVideo, setSpeakers, setVideoFeeds, videoStore, type VideoFeed } from './videoStore';

const feed: VideoFeed = {
  id: '2:s-2/TR_1', identity: '2:s-2', source: 'camera', local: false, muted: false, mirrored: false,
  handle: { attach: (element) => element, detach: () => undefined },
};

describe('call video store', () => {
  beforeEach(resetVideo);

  it('toggles a pin and clears it when a share is chosen', () => {
    pinTile('person:2:s-2');
    expect(videoStore.get().pinned).toBe('person:2:s-2');
    pinTile('person:2:s-2');
    expect(videoStore.get().pinned).toBeNull();
    pinTile('person:3:s-3');
    chooseShare('screen:2:s-2/TR_9');
    expect(videoStore.get()).toMatchObject({ pinned: null, share: 'screen:2:s-2/TR_9' });
  });

  it('remembers the last speaker after everyone went quiet and skips unchanged speaker lists', () => {
    setSpeakers(['2:s-2']);
    const speaking = videoStore.get();
    setSpeakers(['2:s-2']);
    expect(videoStore.get()).toBe(speaking);
    setSpeakers([]);
    expect(videoStore.get()).toMatchObject({ speakers: [], recentSpeaker: '2:s-2' });
  });

  it('keeps the pin while feeds change and forgets everything on reset', () => {
    pinTile('person:2:s-2');
    setVideoFeeds([feed]);
    expect(videoStore.get()).toMatchObject({ feeds: [feed], pinned: 'person:2:s-2' });
    resetVideo();
    expect(videoStore.get()).toEqual(emptyVideoState);
  });
});
