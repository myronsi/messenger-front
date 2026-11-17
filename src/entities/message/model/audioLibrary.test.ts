import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ token: 'token-a', listeners: new Set<() => void>() }));
vi.mock('@/shared/auth/session', () => ({
  getAccessToken: () => session.token,
  subscribeToAccessToken: (listener: () => void) => { session.listeners.add(listener); return () => session.listeners.delete(listener); },
}));
vi.mock('@/shared/auth/tokenClaims', () => ({ getTokenSubject: (token: string | null) => (token ? `user-${token}` : null) }));
vi.mock('./audioPlayer', () => ({ onTrackPlayed: vi.fn(), onTrackUpdated: vi.fn() }));

const song = (id: string) => ({ id, src: `/${id}.mp3`, title: id, kind: 'music' as const });
const load = () => import('./audioLibrary');

describe('audio library', () => {
  beforeEach(() => {
    localStorage.clear();
    session.token = 'token-a';
    vi.resetModules();
  });

  it('keeps recently played tracks newest first without duplicates', async () => {
    const lib = await load();
    lib.rememberPlayed(song('a'));
    lib.rememberPlayed(song('b'));
    lib.rememberPlayed(song('a'));
    expect(lib.audioLibrary().history.map((track) => track.id)).toEqual(['a', 'b']);
    lib.clearHistory();
    expect(lib.audioLibrary().history).toEqual([]);
  });

  it('creates, fills, reorders, renames and deletes playlists', async () => {
    const lib = await load();
    const list = lib.createPlaylist('  Road trip  ', [song('a')]);
    expect(list?.name).toBe('Road trip');
    expect(lib.createPlaylist('   ')).toBeNull();
    lib.addToPlaylist(list!.id, song('b'));
    lib.addToPlaylist(list!.id, song('b'));
    lib.moveInPlaylist(list!.id, 1, 0);
    expect(lib.audioLibrary().playlists[0].tracks.map((track) => track.id)).toEqual(['b', 'a']);
    lib.removeFromPlaylist(list!.id, 'b');
    lib.renamePlaylist(list!.id, 'Gym');
    expect(lib.audioLibrary().playlists[0]).toMatchObject({ name: 'Gym', tracks: [song('a')] });
    lib.deletePlaylist(list!.id);
    expect(lib.audioLibrary().playlists).toEqual([]);
  });

  it('stores the library per account and survives a reload', async () => {
    let lib = await load();
    lib.createPlaylist('Mine', [song('a')]);
    vi.resetModules();
    lib = await load();
    expect(lib.audioLibrary().playlists.map((list) => list.name)).toEqual(['Mine']);
    session.token = 'token-b';
    session.listeners.forEach((listener) => listener());
    expect(lib.audioLibrary().playlists).toEqual([]);
  });

  it('ignores broken saved data', async () => {
    localStorage.setItem('audio_library:user-token-a', '{"history":[{"nope":1}],"playlists":"x"}');
    const lib = await load();
    expect(lib.audioLibrary()).toEqual({ history: [], playlists: [] });
  });
});
