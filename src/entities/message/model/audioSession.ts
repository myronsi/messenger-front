import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { playerSnapshot, restorePlayer, subscribeAudioPlayer, type PlayerSnapshot } from './audioPlayer';
import type { AudioTrack, RepeatMode } from './audioTypes';

const KEY = 'audio_session';
const SAVE_EVERY_MS = 2000;
const REPEAT_MODES: RepeatMode[] = ['off', 'all', 'one'];

let owner: string | null | undefined;
let lastSaved = 0;
let pending: number | null = null;

const storageKey = (account: string) => `${KEY}:${account}`;

const lasting = (track: AudioTrack): AudioTrack => ({ ...track, cover: track.cover?.startsWith('blob:') ? undefined : track.cover });

const isTrack = (value: unknown): value is AudioTrack => {
  const track = value as AudioTrack | null;
  return !!track && (typeof track.id === 'string' || typeof track.id === 'number') && typeof track.src === 'string'
    && typeof track.title === 'string' && (track.kind === 'music' || track.kind === 'voice');
};

const tracks = (value: unknown) => (Array.isArray(value) && value.every(isTrack) ? value : null);

export const readAudioSession = (account: string): PlayerSnapshot | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(account)) ?? 'null') as Partial<PlayerSnapshot> | null;
    const list = tracks(saved?.list);
    if (!saved || !list?.length || !Number.isInteger(saved.index) || (saved.index as number) < 0 || (saved.index as number) >= list.length) return null;
    return {
      list,
      index: saved.index as number,
      time: typeof saved.time === 'number' && saved.time > 0 ? saved.time : 0,
      shuffle: saved.shuffle === true,
      repeat: REPEAT_MODES.includes(saved.repeat as RepeatMode) ? saved.repeat as RepeatMode : 'off',
      unshuffled: tracks(saved.unshuffled),
    };
  } catch {
    return null;
  }
};

const write = () => {
  if (pending !== null) window.clearTimeout(pending);
  pending = null;
  if (!owner) return;
  const snapshot = playerSnapshot();
  try {
    if (!snapshot) {
      localStorage.removeItem(storageKey(owner));
      return;
    }
    localStorage.setItem(storageKey(owner), JSON.stringify({
      ...snapshot, time: Math.floor(snapshot.time), list: snapshot.list.map(lasting), unshuffled: snapshot.unshuffled?.map(lasting) ?? null,
    }));
    lastSaved = Date.now();
  } catch {
    return;
  }
};

const schedule = () => {
  if (pending !== null) return;
  pending = window.setTimeout(write, Math.max(0, SAVE_EVERY_MS - (Date.now() - lastSaved)));
};

const sync = () => {
  const next = getTokenSubject(getAccessToken()) ?? null;
  if (next === owner) return;
  owner = next;
  const saved = next ? readAudioSession(next) : null;
  if (saved) restorePlayer(saved);
};

export const startAudioSession = () => {
  sync();
  const stopStore = subscribeAudioPlayer(schedule);
  const stopToken = subscribeToAccessToken(sync);
  const onHidden = () => { if (document.visibilityState === 'hidden') write(); };
  window.addEventListener('pagehide', write);
  document.addEventListener('visibilitychange', onHidden);
  return () => {
    stopStore();
    stopToken();
    window.removeEventListener('pagehide', write);
    document.removeEventListener('visibilitychange', onHidden);
  };
};
