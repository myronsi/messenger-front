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

  it('keeps old local playlists only for the one-time upload and drops them after', async () => {
    localStorage.setItem('audio_library:user-token-a', JSON.stringify({ history: [], playlists: [{ id: 'p', name: 'Mine', tracks: [song('a')] }] }));
    const lib = await load();
    expect(lib.localPlaylists().map((list) => list.name)).toEqual(['Mine']);
    lib.dropLocalPlaylists();
    expect(lib.localPlaylists()).toEqual([]);
    vi.resetModules();
    expect((await load()).localPlaylists()).toEqual([]);
  });

  it('stores the history per account and survives a reload', async () => {
    let lib = await load();
    lib.rememberPlayed(song('a'));
    vi.resetModules();
    lib = await load();
    expect(lib.audioLibrary().history.map((track) => track.id)).toEqual(['a']);
    session.token = 'token-b';
    session.listeners.forEach((listener) => listener());
    expect(lib.audioLibrary().history).toEqual([]);
  });

  it('ignores broken saved data', async () => {
    localStorage.setItem('audio_library:user-token-a', '{"history":[{"nope":1}],"playlists":"x"}');
    const lib = await load();
    expect(lib.audioLibrary().history).toEqual([]);
    expect(lib.localPlaylists()).toEqual([]);
  });
});
