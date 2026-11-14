import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { acquireMedia, isProtectedMedia } from '@/shared/api/mediaCache';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { getPlaybackSpeed, subscribePlaybackSpeed } from './playbackSpeed';

export type AudioTrackKind = 'voice' | 'music';

export interface AudioTrack {
  id: EntityId;
  src: string;
  title: string;
  kind: AudioTrackKind;
  duration?: number;
}

export interface AudioPlayerState {
  track: AudioTrack | null;
  list: AudioTrack[];
  index: number;
  playing: boolean;
  loading: boolean;
  error: boolean;
  time: number;
  duration: number;
}

const IDLE: AudioPlayerState = { track: null, list: [], index: -1, playing: false, loading: false, error: false, time: 0, duration: 0 };

let state = IDLE;
let element: HTMLAudioElement | null = null;
let lease: { release: () => void } | null = null;
let loadRun = 0;
const listeners = new Set<() => void>();

const usable = (value?: number): value is number => !!value && Number.isFinite(value) && value > 0;

const emit = (patch: Partial<AudioPlayerState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const releaseLease = () => {
  lease?.release();
  lease = null;
};

const updateMediaSession = () => {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  navigator.mediaSession.metadata = state.track ? new MediaMetadata({ title: state.track.title }) : null;
  navigator.mediaSession.playbackState = state.track ? (state.playing ? 'playing' : 'paused') : 'none';
};

const audioElement = () => {
  if (element) return element;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('timeupdate', () => emit({ time: audio.currentTime || 0 }));
  audio.addEventListener('loadedmetadata', () => { if (usable(audio.duration)) emit({ duration: audio.duration }); });
  audio.addEventListener('playing', () => { emit({ playing: true, loading: false }); updateMediaSession(); });
  audio.addEventListener('pause', () => { emit({ playing: false }); updateMediaSession(); });
  audio.addEventListener('ended', () => playNextAudio());
  audio.addEventListener('error', () => { if (audio.getAttribute('src')) emit({ playing: false, loading: false, error: true }); });
  subscribePlaybackSpeed(() => {
    audio.defaultPlaybackRate = getPlaybackSpeed();
    audio.playbackRate = getPlaybackSpeed();
  });
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler?.('play', () => resumeAudio());
    navigator.mediaSession.setActionHandler?.('pause', () => pauseAudio());
    navigator.mediaSession.setActionHandler?.('nexttrack', () => playNextAudio());
    navigator.mediaSession.setActionHandler?.('previoustrack', () => playPreviousAudio());
  }
  element = audio;
  return audio;
};

const RESTART_AFTER_SECONDS = 3;
const MAX_HISTORY = 20;

const load = async (index: number, startAt = 0) => {
  const track = state.list[index];
  if (!track) return;
  const run = ++loadRun;
  releaseLease();
  const audio = audioElement();
  audio.pause();
  emit({ track, index, playing: false, loading: true, error: false, time: startAt, duration: usable(track.duration) ? track.duration : 0 });
  updateMediaSession();
  const url = resolveMediaUrl(track.src);
  let source = url;
  if (isProtectedMedia(url)) {
    const current = acquireMedia(url);
    lease = current;
    try {
      source = await current.promise;
    } catch {
      if (run === loadRun) emit({ loading: false, error: true });
      return;
    }
    if (run !== loadRun) return;
  }
  audio.src = source;
  audio.defaultPlaybackRate = getPlaybackSpeed();
  audio.playbackRate = getPlaybackSpeed();
  if (startAt > 0) audio.currentTime = startAt;
  audio.play().catch(() => { if (run === loadRun) emit({ playing: false, loading: false }); });
};

export const playAudio = (track: AudioTrack, upcoming: AudioTrack[] = [], startAt?: number) => {
  if (state.track?.id === track.id && !state.error) {
    if (startAt !== undefined) seekAudio(startAt);
    resumeAudio();
    return;
  }
  const played = state.list.slice(0, state.index + 1)
    .filter((item) => item.id !== track.id && !upcoming.some((next) => next.id === item.id)).slice(-MAX_HISTORY);
  emit({ list: [...played, track, ...upcoming] });
  void load(played.length, startAt);
};

export const playAudioAt = (index: number) => {
  if (index === state.index) toggleAudio();
  else void load(index);
};

export const moveAudioTrack = (from: number, to: number) => {
  if (from === to || !state.list[from] || !state.list[to]) return;
  const list = [...state.list];
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  emit({ list, index: state.track ? list.findIndex((item) => item.id === state.track?.id) : -1 });
};

export const resumeAudio = () => {
  if (!state.track || !element?.getAttribute('src')) return;
  element.play().catch(() => emit({ playing: false }));
};

export const pauseAudio = () => element?.pause();

export const toggleAudio = () => (state.playing ? pauseAudio() : resumeAudio());

export const seekAudio = (seconds: number) => {
  if (!element || !state.track) return;
  element.currentTime = seconds;
  emit({ time: seconds });
};

export const audioPosition = () => element?.currentTime ?? state.time;

export const audioPlayerState = () => state;

export const stopAudio = () => {
  loadRun += 1;
  if (element) {
    element.pause();
    element.removeAttribute('src');
    element.load();
  }
  releaseLease();
  state = IDLE;
  listeners.forEach((listener) => listener());
  updateMediaSession();
};

export const playNextAudio = () => {
  if (state.index + 1 < state.list.length) void load(state.index + 1);
  else stopAudio();
};

export const playPreviousAudio = () => {
  if (state.index > 0 && audioPosition() < RESTART_AFTER_SECONDS) void load(state.index - 1);
  else seekAudio(0);
};

subscribeToAccessToken(() => { if (!getAccessToken() && state.track) stopAudio(); });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useAudioPlayer = <T,>(select: (current: AudioPlayerState) => T): T => (
  useSyncExternalStore(subscribe, () => select(state), () => select(IDLE))
);
