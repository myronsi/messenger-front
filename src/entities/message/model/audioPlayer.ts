import { useSyncExternalStore } from 'react';
import { acquireMedia, isProtectedMedia } from '@/shared/api/mediaCache';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { getPlaybackSpeed, subscribePlaybackSpeed } from './playbackSpeed';
import { bindMediaSession, syncMediaSession } from './audioMediaSession';
import { REPEAT_ORDER, sameTrack, shuffled, trackTagPatch, trackUpdateListeners, without } from './audioQueueHelpers';

import { IDLE, type AudioPlayerState, type AudioTrack } from './audioTypes';

export { onTrackUpdated } from './audioQueueHelpers';
export type { AudioPlayerState, AudioTrack, AudioTrackKind, RepeatMode } from './audioTypes';

let state = IDLE;
let unshuffled: AudioTrack[] | null = null;
const playedListeners = new Set<(track: AudioTrack) => void>();
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

const updateMediaSession = () => syncMediaSession(state.track, state.playing);

const audioElement = () => {
  if (element) return element;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('timeupdate', () => emit({ time: audio.currentTime || 0 }));
  audio.addEventListener('loadedmetadata', () => { if (usable(audio.duration)) emit({ duration: audio.duration }); });
  audio.addEventListener('playing', () => {
    const fresh = state.loading;
    emit({ playing: true, loading: false });
    updateMediaSession();
    if (fresh && state.track) playedListeners.forEach((listener) => listener(state.track as AudioTrack));
  });
  audio.addEventListener('pause', () => { emit({ playing: false }); updateMediaSession(); });
  audio.addEventListener('ended', () => finishTrack());
  audio.addEventListener('error', () => { if (audio.getAttribute('src')) emit({ playing: false, loading: false, error: true }); });
  subscribePlaybackSpeed(() => {
    audio.defaultPlaybackRate = getPlaybackSpeed();
    audio.playbackRate = getPlaybackSpeed();
  });
  bindMediaSession({ play: () => resumeAudio(), pause: () => pauseAudio(), next: () => playNextAudio(), previous: () => playPreviousAudio() });
  element = audio;
  return audio;
};


const applyTrackPatch = (id: string, patch: Partial<AudioTrack>) => {
  if (!Object.keys(patch).length) return;
  const update = (item: AudioTrack) => (String(item.id) === id ? { ...item, ...patch } : item);
  if (unshuffled) unshuffled = unshuffled.map(update);
  emit({ list: state.list.map(update), track: state.track ? update(state.track) : null });
  updateMediaSession();
  trackUpdateListeners.forEach((listener) => listener(id, patch));
};

const enrichTrack = async (track: AudioTrack, source: string) => {
  if (track.kind !== 'music' || typeof fetch !== 'function') return;
  applyTrackPatch(String(track.id), await trackTagPatch(track, source));
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
  void enrichTrack(track, source);
  audio.defaultPlaybackRate = getPlaybackSpeed();
  audio.playbackRate = getPlaybackSpeed();
  if (startAt > 0) audio.currentTime = startAt;
  audio.play().catch(() => { if (run === loadRun) emit({ playing: false, loading: false }); });
};

export const playAudio = (track: AudioTrack, upcoming: AudioTrack[] = [], startAt?: number) => {
  if (state.track && sameTrack(state.track, track) && !state.error) {
    if (startAt !== undefined) seekAudio(startAt);
    resumeAudio();
    return;
  }
  const played = state.list.slice(0, state.index + 1)
    .filter((item) => !sameTrack(item, track) && !upcoming.some((next) => sameTrack(next, item))).slice(-MAX_HISTORY);
  unshuffled = state.shuffle ? [...played, track, ...upcoming] : null;
  emit({ list: [...played, track, ...(state.shuffle ? shuffled(upcoming) : upcoming)] });
  void load(played.length, startAt);
};

export const playTracks = (tracks: AudioTrack[], start = 0) => {
  const first = tracks[start];
  if (!first) return;
  const rest = tracks.filter((_, index) => index !== start);
  unshuffled = state.shuffle ? [first, ...rest] : null;
  emit({ list: [first, ...(state.shuffle ? shuffled(rest) : rest)] });
  void load(0);
};

export const playNextInQueue = (track: AudioTrack) => {
  if (!state.track) {
    playAudio(track);
    return;
  }
  if (sameTrack(state.track, track)) return;
  const list = without(state.list, track);
  const index = list.findIndex((item) => sameTrack(item, state.track as AudioTrack));
  list.splice(index + 1, 0, track);
  if (unshuffled) unshuffled = [...without(unshuffled, track), track];
  emit({ list, index });
};

export const addToQueue = (track: AudioTrack) => {
  if (!state.track) {
    playAudio(track);
    return;
  }
  if (sameTrack(state.track, track)) return;
  const list = [...without(state.list, track), track];
  if (unshuffled) unshuffled = [...without(unshuffled, track), track];
  emit({ list, index: list.findIndex((item) => sameTrack(item, state.track as AudioTrack)) });
};

export const removeFromQueue = (position: number) => {
  const target = state.list[position];
  if (!target || position === state.index) return;
  const list = state.list.filter((_, index) => index !== position);
  if (unshuffled) unshuffled = without(unshuffled, target);
  emit({ list, index: position < state.index ? state.index - 1 : state.index });
};

export const clearUpcoming = () => {
  if (!state.track) return;
  const list = state.list.slice(0, state.index + 1);
  if (unshuffled) unshuffled = list;
  emit({ list });
};

export const toggleShuffle = () => {
  if (!state.track) {
    emit({ shuffle: !state.shuffle });
    return;
  }
  const head = state.list.slice(0, state.index + 1);
  if (!state.shuffle) {
    unshuffled = [...state.list];
    emit({ shuffle: true, list: [...head, ...shuffled(state.list.slice(state.index + 1))] });
    return;
  }
  const original = unshuffled ?? state.list;
  unshuffled = null;
  const rest = original.filter((item) => !head.some((played) => sameTrack(played, item)));
  emit({ shuffle: false, list: [...head, ...rest] });
};

export const cycleRepeat = () => emit({ repeat: REPEAT_ORDER[(REPEAT_ORDER.indexOf(state.repeat) + 1) % REPEAT_ORDER.length] });

export const onTrackPlayed = (listener: (track: AudioTrack) => void) => {
  playedListeners.add(listener);
  return () => { playedListeners.delete(listener); };
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
  if (!state.track) return;
  if (!element?.getAttribute('src')) {
    void load(state.index, state.time);
    return;
  }
  element.play().catch(() => emit({ playing: false }));
};

export const pauseAudio = () => element?.pause();

export const toggleAudio = () => (state.playing ? pauseAudio() : resumeAudio());

export const seekAudio = (seconds: number) => {
  if (!state.track) return;
  if (element?.getAttribute('src')) element.currentTime = seconds;
  emit({ time: seconds });
};

export interface PlayerSnapshot {
  list: AudioTrack[];
  index: number;
  time: number;
  shuffle: boolean;
  repeat: AudioPlayerState['repeat'];
  unshuffled: AudioTrack[] | null;
}

export const playerSnapshot = (): PlayerSnapshot | null => (state.track ? {
  list: state.list, index: state.index, time: state.playing ? audioPosition() : state.time, shuffle: state.shuffle, repeat: state.repeat, unshuffled,
} : null);

export const restorePlayer = (snapshot: PlayerSnapshot) => {
  const track = snapshot.list[snapshot.index];
  if (state.track || !track) return;
  unshuffled = snapshot.unshuffled;
  emit({
    list: snapshot.list, index: snapshot.index, track, time: snapshot.time, duration: usable(track.duration) ? track.duration : 0,
    shuffle: snapshot.shuffle, repeat: snapshot.repeat, playing: false, loading: false, error: false,
  });
  updateMediaSession();
};

export const audioPosition = () => element?.currentTime ?? state.time;

export const audioPlayerState = () => state;

export const stopAudio = () => {
  loadRun += 1;
  unshuffled = null;
  if (element) {
    element.pause();
    element.removeAttribute('src');
    element.load();
  }
  releaseLease();
  state = { ...IDLE, shuffle: state.shuffle, repeat: state.repeat };
  listeners.forEach((listener) => listener());
  updateMediaSession();
};

export const playNextAudio = () => {
  if (state.index + 1 < state.list.length) void load(state.index + 1);
  else if (state.repeat === 'all' && state.list.length > 0) void load(0);
  else stopAudio();
};

const finishTrack = () => {
  if (state.repeat === 'one' && state.track) {
    seekAudio(0);
    resumeAudio();
    return;
  }
  playNextAudio();
};

export const playPreviousAudio = () => {
  if (state.index > 0 && audioPosition() < RESTART_AFTER_SECONDS) void load(state.index - 1);
  else seekAudio(0);
};

subscribeToAccessToken(() => { if (!getAccessToken() && state.track) stopAudio(); });

export const subscribeAudioPlayer = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useAudioPlayer = <T,>(select: (current: AudioPlayerState) => T): T => (
  useSyncExternalStore(subscribeAudioPlayer, () => select(state), () => select(IDLE))
);
