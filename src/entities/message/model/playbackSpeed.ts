import { useSyncExternalStore } from 'react';

const SPEEDS = [1, 1.5, 2];
let speed = 1;
const listeners = new Set<() => void>();

export const subscribePlaybackSpeed = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const getPlaybackSpeed = () => speed;

export const nextPlaybackSpeed = () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  listeners.forEach((listener) => listener());
};

export const usePlaybackSpeed = () => useSyncExternalStore(subscribePlaybackSpeed, getPlaybackSpeed, getPlaybackSpeed);
