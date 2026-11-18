import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ token: 'token-a' as string | null, listeners: new Set<() => void>() }));
vi.mock('@/shared/api/mediaCache', () => ({ isProtectedMedia: () => false, acquireMedia: vi.fn() }));
vi.mock('@/shared/lib/remoteSongTags', () => ({ readRemoteSongTags: vi.fn(async () => ({})) }));
vi.mock('@/shared/auth/session', () => ({
  getAccessToken: () => session.token,
  subscribeToAccessToken: (listener: () => void) => { session.listeners.add(listener); return () => session.listeners.delete(listener); },
}));
vi.mock('@/shared/auth/tokenClaims', () => ({ getTokenSubject: (token: string | null) => (token ? `user-${token}` : null) }));

const song = (id: string) => ({ id, src: `/${id}.mp3`, title: `Song ${id}`, kind: 'music' as const, duration: 200 });
const KEY = 'audio_session:user-token-a';
const load = async () => ({ player: await import('./audioPlayer'), saver: await import('./audioSession') });

beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});

describe('audio session', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    localStorage.clear();
    session.token = 'token-a';
    session.listeners.clear();
    vi.resetModules();
  });
  afterEach(() => vi.useRealTimers());

  it('saves the queue and position and restores it paused after a reload', async () => {
    let { player, saver } = await load();
    const stop = saver.startAudioSession();
    player.playAudio(song('a'), [song('b'), song('c')]);
    await vi.advanceTimersByTimeAsync(10);
    player.playNextAudio();
    await vi.advanceTimersByTimeAsync(10);
    player.seekAudio(42.7);
    player.toggleShuffle();
    player.cycleRepeat();
    await vi.advanceTimersByTimeAsync(2500);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved).toMatchObject({ index: 1, time: 42, shuffle: true, repeat: 'all' });
    expect(saved.unshuffled.map((track: { id: string }) => track.id)).toEqual(['a', 'b', 'c']);
    stop();

    vi.resetModules();
    ({ player, saver } = await load());
    saver.startAudioSession();
    const state = player.audioPlayerState();
    expect(state.track?.id).toBe('b');
    expect(state.list.map((track) => track.id)).toEqual(saved.list.map((track: { id: string }) => track.id));
    expect(state).toMatchObject({ playing: false, loading: false, time: 42, shuffle: true, repeat: 'all', duration: 200 });
  });

  it('starts the restored song from the saved spot on play', async () => {
    localStorage.setItem(KEY, JSON.stringify({ list: [song('a'), song('b')], index: 1, time: 30, shuffle: false, repeat: 'off', unshuffled: null }));
    const { player, saver } = await load();
    saver.startAudioSession();
    player.toggleAudio();
    await vi.advanceTimersByTimeAsync(10);
    const audio = HTMLMediaElement.prototype.play as unknown as ReturnType<typeof vi.fn>;
    expect(audio).toHaveBeenCalled();
    expect(player.audioPlayerState()).toMatchObject({ loading: true, time: 30 });
    expect(player.audioPosition()).toBe(30);
  });

  it('forgets the session when the player is closed but keeps it when signing out', async () => {
    const { player, saver } = await load();
    saver.startAudioSession();
    player.playAudio(song('a'));
    await vi.advanceTimersByTimeAsync(2500);
    expect(localStorage.getItem(KEY)).not.toBeNull();
    session.token = null;
    session.listeners.forEach((listener) => listener());
    player.stopAudio();
    await vi.advanceTimersByTimeAsync(2500);
    expect(localStorage.getItem(KEY)).not.toBeNull();
    session.token = 'token-a';
    session.listeners.forEach((listener) => listener());
    expect(player.audioPlayerState().track?.id).toBe('a');
    player.stopAudio();
    await vi.advanceTimersByTimeAsync(2500);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('ignores broken saved data and drops covers that only lived in memory', async () => {
    localStorage.setItem(KEY, '{"list":[{"id":1}],"index":0}');
    const { player, saver } = await load();
    saver.startAudioSession();
    expect(player.audioPlayerState().track).toBeNull();
    player.playAudio({ ...song('a'), cover: 'blob:abc' });
    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(localStorage.getItem(KEY)!).list[0].cover).toBeUndefined();
  });
});
