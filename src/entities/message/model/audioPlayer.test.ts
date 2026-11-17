import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  addToQueue, audioPlayerState, clearUpcoming, cycleRepeat, moveAudioTrack, playAudio, playAudioAt, playNextAudio, playNextInQueue, playPreviousAudio,
  playTracks, removeFromQueue, stopAudio, toggleShuffle, type AudioTrack,
} from './audioPlayer';

vi.mock('@/shared/api/mediaCache', () => ({ isProtectedMedia: () => false, acquireMedia: vi.fn() }));
const tagReader = vi.hoisted(() => ({ read: vi.fn(async () => ({})) }));
vi.mock('@/shared/lib/songTags', () => ({ readSongTags: tagReader.read }));

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

describe('audio player queue actions', () => {
  it('plays a track next or at the end, and starts playing when nothing plays', async () => {
    playAudio(track('a'), [track('b')]);
    await flush();
    playNextInQueue(track('x'));
    addToQueue(track('y'));
    expect(ids()).toEqual(['a', 'x', 'b', 'y']);
    addToQueue(track('x'));
    expect(ids()).toEqual(['a', 'b', 'y', 'x']);
    stopAudio();
    addToQueue(track('z'));
    await flush();
    expect(audioPlayerState().track?.id).toBe('z');
  });

  it('removes and clears upcoming tracks but never the current one', async () => {
    playAudio(track('a'), [track('b'), track('c')]);
    await flush();
    removeFromQueue(0);
    expect(ids()).toEqual(['a', 'b', 'c']);
    removeFromQueue(1);
    expect(ids()).toEqual(['a', 'c']);
    clearUpcoming();
    expect(ids()).toEqual(['a']);
  });

  it('shuffles only what comes next and restores the order', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    playAudio(track('a'), [track('b'), track('c'), track('d')]);
    await flush();
    toggleShuffle();
    expect(ids()[0]).toBe('a');
    expect([...ids()].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(ids()).not.toEqual(['a', 'b', 'c', 'd']);
    toggleShuffle();
    expect(ids()).toEqual(['a', 'b', 'c', 'd']);
    vi.restoreAllMocks();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
  });

  it('repeats the queue from the start and cycles repeat modes', async () => {
    playTracks([track('a'), track('b')], 1);
    await flush();
    expect(ids()).toEqual(['b', 'a']);
    expect(audioPlayerState().repeat).toBe('off');
    cycleRepeat();
    expect(audioPlayerState().repeat).toBe('all');
    playNextAudio();
    await flush();
    playNextAudio();
    await flush();
    expect(audioPlayerState().track?.id).toBe('b');
    cycleRepeat();
    expect(audioPlayerState().repeat).toBe('one');
    cycleRepeat();
    expect(audioPlayerState().repeat).toBe('off');
  });
});

describe('audio player song tags', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fills title, artist and cover of a chat song from its file tags', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) })));
    URL.createObjectURL = vi.fn(() => 'blob:cover');
    tagReader.read.mockResolvedValueOnce({ title: 'Do Unto Others', artist: 'Band', cover: new Blob(['c']) } as never);
    playAudio({ ...track('tagged'), title: '02 Do Unto Others' });
    await flush();
    await flush();
    expect(audioPlayerState().track).toMatchObject({ title: 'Do Unto Others', artist: 'Band', cover: 'blob:cover' });
  });

  it('keeps a title that already came with an artist and skips voice messages', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) }));
    vi.stubGlobal('fetch', fetcher);
    tagReader.read.mockResolvedValueOnce({ title: 'File title', artist: 'File artist' } as never);
    playAudio({ ...track('profile-song'), title: 'Chosen title', artist: 'Chosen artist' });
    await flush();
    await flush();
    expect(audioPlayerState().track).toMatchObject({ title: 'Chosen title', artist: 'Chosen artist' });
    fetcher.mockClear();
    playAudio({ ...track('voice-1'), kind: 'voice' });
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
