import { useSyncExternalStore } from 'react';

let open = false;
const listeners = new Set<() => void>();

const set = (next: boolean) => {
  if (open === next) return;
  open = next;
  listeners.forEach((listener) => listener());
};

export const openNowPlaying = () => set(true);
export const closeNowPlaying = () => set(false);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useNowPlayingOpen = () => useSyncExternalStore(subscribe, () => open, () => false);
