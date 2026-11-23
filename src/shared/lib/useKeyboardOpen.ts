import { useSyncExternalStore } from 'react';
import { keyboardInset } from './composerFocus';

const subscribe = (listener: () => void) => {
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', listener);
  window.addEventListener('resize', listener);
  return () => {
    viewport?.removeEventListener('resize', listener);
    window.removeEventListener('resize', listener);
  };
};

const keyboardShown = () => keyboardInset() > 0;
const never = () => false;

export const useKeyboardOpen = (enabled = true) => useSyncExternalStore(subscribe, enabled ? keyboardShown : never, never);
