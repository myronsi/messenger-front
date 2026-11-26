import { createStore } from './createStore';

export type VideoSource = 'camera' | 'screen';

export interface VideoHandle {
  attach: (element: HTMLMediaElement) => HTMLMediaElement;
  detach: (element: HTMLMediaElement) => unknown;
}

export interface VideoFeed {
  id: string;
  identity: string;
  source: VideoSource;
  local: boolean;
  muted: boolean;
  mirrored: boolean;
  handle: VideoHandle;
}

export interface VideoState {
  feeds: VideoFeed[];
  speakers: string[];
  recentSpeaker: string | null;
  pinned: string | null;
  share: string | null;
}

export const emptyVideoState: VideoState = { feeds: [], speakers: [], recentSpeaker: null, pinned: null, share: null };

export const videoStore = createStore<VideoState>(emptyVideoState);

const sameList = (left: readonly string[], right: readonly string[]) => (
  left.length === right.length && left.every((item, index) => item === right[index])
);

export const setVideoFeeds = (feeds: VideoFeed[]) => videoStore.update((state) => ({ ...state, feeds }));

export const setSpeakers = (speakers: string[]) => videoStore.update((state) => {
  const recentSpeaker = speakers[0] ?? state.recentSpeaker;
  if (sameList(state.speakers, speakers) && recentSpeaker === state.recentSpeaker) return state;
  return { ...state, speakers, recentSpeaker };
});

export const pinTile = (id: string | null) => videoStore.update((state) => ({ ...state, pinned: state.pinned === id ? null : id }));

export const chooseShare = (id: string) => videoStore.update((state) => ({ ...state, share: id, pinned: null }));

export const resetVideo = () => videoStore.set(emptyVideoState);
