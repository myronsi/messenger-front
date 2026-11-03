import { useSyncExternalStore } from 'react';

const SPEEDS = [1, 1.5, 2];
let speed = 1;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const nextPlaybackSpeed = () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  listeners.forEach((listener) => listener());
};

export const usePlaybackSpeed = () => useSyncExternalStore(subscribe, () => speed, () => speed);
