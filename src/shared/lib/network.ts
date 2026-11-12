import { useSyncExternalStore } from 'react';

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};

export const useOffline = () => useSyncExternalStore(subscribe, isOffline, () => false);
