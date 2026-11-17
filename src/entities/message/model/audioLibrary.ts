import { useSyncExternalStore } from 'react';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { onTrackPlayed, onTrackUpdated, type AudioTrack } from './audioPlayer';

export interface Playlist {
  id: string;
  name: string;
  tracks: AudioTrack[];
  updatedAt: number;
}

export interface AudioLibrary {
  history: AudioTrack[];
  playlists: Playlist[];
}

const EMPTY: AudioLibrary = { history: [], playlists: [] };
const MAX_HISTORY = 50;
const MAX_NAME = 60;
const KEY = 'audio_library';

let account: string | null = null;
let library = EMPTY;
const listeners = new Set<() => void>();

const storageKey = (owner: string) => `${KEY}:${owner}`;

const trackShape = (value: unknown): value is AudioTrack => {
  const track = value as AudioTrack | null;
  return !!track && (typeof track.id === 'string' || typeof track.id === 'number') && typeof track.src === 'string' && typeof track.title === 'string';
};

const read = (owner: string | null): AudioLibrary => {
  if (!owner) return EMPTY;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(owner)) ?? 'null') as Partial<AudioLibrary> | null;
    return {
      history: Array.isArray(saved?.history) ? saved.history.filter(trackShape).slice(0, MAX_HISTORY) : [],
      playlists: Array.isArray(saved?.playlists)
        ? saved.playlists.filter((list) => typeof list?.id === 'string' && typeof list.name === 'string')
          .map((list) => ({ ...list, tracks: Array.isArray(list.tracks) ? list.tracks.filter(trackShape) : [] }))
        : [],
    };
  } catch {
    return EMPTY;
  }
};

const sync = () => {
  const owner = getTokenSubject(getAccessToken()) ?? null;
  if (owner === account) return;
  account = owner;
  library = read(owner);
  listeners.forEach((listener) => listener());
};

const commit = (next: AudioLibrary) => {
  sync();
  library = next;
  if (account) {
    try {
      localStorage.setItem(storageKey(account), JSON.stringify(library));
    } catch {
      return;
    }
  }
  listeners.forEach((listener) => listener());
};

const same = (a: AudioTrack, b: AudioTrack) => String(a.id) === String(b.id);
const lasting = (cover?: string) => (cover && !cover.startsWith('blob:') ? cover : undefined);
const stored = (track: AudioTrack): AudioTrack => ({
  id: track.id, src: track.src, title: track.title, kind: track.kind, duration: track.duration, artist: track.artist, cover: lasting(track.cover),
  origin: track.origin,
});
const cleanName = (name: string) => name.trim().slice(0, MAX_NAME);
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const updatePlaylist = (id: string, change: (playlist: Playlist) => Playlist) => {
  commit({ ...library, playlists: library.playlists.map((playlist) => (playlist.id === id ? { ...change(playlist), updatedAt: Date.now() } : playlist)) });
};

export const rememberPlayed = (track: AudioTrack) => {
  commit({ ...library, history: [stored(track), ...library.history.filter((item) => !same(item, track))].slice(0, MAX_HISTORY) });
};

export const clearHistory = () => commit({ ...library, history: [] });

export const createPlaylist = (name: string, tracks: AudioTrack[] = []) => {
  const playlist: Playlist = { id: newId(), name: cleanName(name), tracks: tracks.map(stored), updatedAt: Date.now() };
  if (!playlist.name) return null;
  commit({ ...library, playlists: [playlist, ...library.playlists] });
  return playlist;
};

export const renamePlaylist = (id: string, name: string) => {
  const next = cleanName(name);
  if (next) updatePlaylist(id, (playlist) => ({ ...playlist, name: next }));
};

export const deletePlaylist = (id: string) => commit({ ...library, playlists: library.playlists.filter((playlist) => playlist.id !== id) });

export const addToPlaylist = (id: string, track: AudioTrack) => updatePlaylist(id, (playlist) => (
  playlist.tracks.some((item) => same(item, track)) ? playlist : { ...playlist, tracks: [...playlist.tracks, stored(track)] }
));

export const removeFromPlaylist = (id: string, trackId: AudioTrack['id']) => updatePlaylist(id, (playlist) => ({
  ...playlist, tracks: playlist.tracks.filter((item) => String(item.id) !== String(trackId)),
}));

export const moveInPlaylist = (id: string, from: number, to: number) => updatePlaylist(id, (playlist) => {
  if (from === to || !playlist.tracks[from] || !playlist.tracks[to]) return playlist;
  const tracks = [...playlist.tracks];
  const [moved] = tracks.splice(from, 1);
  tracks.splice(to, 0, moved);
  return { ...playlist, tracks };
});

export const audioLibrary = () => {
  sync();
  return library;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useAudioLibrary = <T,>(select: (current: AudioLibrary) => T): T => (
  useSyncExternalStore(subscribe, () => select(audioLibrary()), () => select(EMPTY))
);

export const updateStoredTrack = (id: string, patch: Partial<AudioTrack>) => {
  sync();
  const change = (track: AudioTrack) => (String(track.id) === id ? stored({ ...track, ...patch }) : track);
  const touches = library.history.some((track) => String(track.id) === id)
    || library.playlists.some((playlist) => playlist.tracks.some((track) => String(track.id) === id));
  if (!touches) return;
  commit({
    history: library.history.map(change),
    playlists: library.playlists.map((playlist) => ({ ...playlist, tracks: playlist.tracks.map(change) })),
  });
};

onTrackPlayed(rememberPlayed);
onTrackUpdated(updateStoredTrack);
subscribeToAccessToken(sync);
