import { useSyncExternalStore } from 'react';

let active = false;
const listeners = new Set<() => void>();

export const isCallActive = () => active;

export const setCallActive = (value: boolean) => {
  if (active === value) return;
  active = value;
  listeners.forEach((listener) => listener());
};

export const subscribeToCallActivity = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useCallActive = () => useSyncExternalStore(subscribeToCallActivity, isCallActive, isCallActive);
