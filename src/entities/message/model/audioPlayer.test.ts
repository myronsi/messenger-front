import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  audioPlayerState, moveAudioTrack, playAudio, playAudioAt, playNextAudio, playPreviousAudio, stopAudio, type AudioTrack,
} from './audioPlayer';

vi.mock('@/shared/api/mediaCache', () => ({ isProtectedMedia: () => false, acquireMedia: vi.fn() }));

const track = (id: string): AudioTrack => ({ id, src: `/${id}.mp3`, title: id, kind: 'music' });
const ids = () => audioPlayerState().list.map((item) => item.id);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});
afterEach(() => stopAudio());

describe('audio player playlist', () => {
  it('plays the queue in order, goes back, and stops after the last track', async () => {
    playAudio(track('a'), [track('b'), track('c')]);
    await flush();
    expect(audioPlayerState().track?.id).toBe('a');
    playNextAudio();
    await flush();
    expect(audioPlayerState().track?.id).toBe('b');
    playPreviousAudio();
    await flush();
    expect(audioPlayerState().track?.id).toBe('a');
    playAudioAt(2);
    await flush();
    expect(audioPlayerState().track?.id).toBe('c');
    playNextAudio();
    expect(audioPlayerState().track).toBeNull();
  });

  it('keeps played tracks in the list when a new track starts', async () => {
    playAudio(track('a'), [track('b')]);
    await flush();
    playAudio(track('x'), [track('y')]);
    await flush();
    expect(ids()).toEqual(['a', 'x', 'y']);
    expect(audioPlayerState().index).toBe(1);
  });

  it('reorders the list and follows the current track', async () => {
    playAudio(track('a'), [track('b'), track('c')]);
    await flush();
    moveAudioTrack(2, 0);
    expect(ids()).toEqual(['c', 'a', 'b']);
    expect(audioPlayerState().index).toBe(1);
  });
});
