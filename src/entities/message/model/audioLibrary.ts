import { useSyncExternalStore } from 'react';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { onTrackPlayed, onTrackUpdated, type AudioTrack } from './audioPlayer';

export interface StoredPlaylist {
  id: string;
  name: string;
  tracks: AudioTrack[];
}

export interface AudioLibrary {
  history: AudioTrack[];
}

interface SavedLibrary extends AudioLibrary {
  playlists: StoredPlaylist[];
}

const EMPTY: SavedLibrary = { history: [], playlists: [] };
const MAX_HISTORY = 50;
const KEY = 'audio_library';

let account: string | null = null;
let library: SavedLibrary = EMPTY;
const listeners = new Set<() => void>();

const storageKey = (owner: string) => `${KEY}:${owner}`;

const trackShape = (value: unknown): value is AudioTrack => {
  const track = value as AudioTrack | null;
  return !!track && (typeof track.id === 'string' || typeof track.id === 'number') && typeof track.src === 'string' && typeof track.title === 'string';
};

const read = (owner: string | null): SavedLibrary => {
  if (!owner) return EMPTY;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(owner)) ?? 'null') as Partial<SavedLibrary> | null;
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

const commit = (next: SavedLibrary) => {
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
  origin: track.origin, attachmentId: track.attachmentId, chatId: track.chatId,
});

export const rememberPlayed = (track: AudioTrack) => {
  commit({ ...library, history: [stored(track), ...library.history.filter((item) => !same(item, track))].slice(0, MAX_HISTORY) });
};

export const clearHistory = () => commit({ ...library, history: [] });

export const localPlaylists = (): StoredPlaylist[] => {
  sync();
  return library.playlists;
};

export const dropLocalPlaylists = () => {
  sync();
  if (library.playlists.length) commit({ ...library, playlists: [] });
};

export const audioLibrary = (): AudioLibrary => {
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
  if (!library.history.some((track) => String(track.id) === id)) return;
  commit({ ...library, history: library.history.map(change) });
};

onTrackPlayed(rememberPlayed);
onTrackUpdated(updateStoredTrack);
subscribeToAccessToken(sync);
