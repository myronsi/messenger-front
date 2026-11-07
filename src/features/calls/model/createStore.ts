import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get: () => T;
  set: (next: T) => void;
  update: (change: (current: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
}

export const createStore = <T,>(initial: T): Store<T> => {
  let state = initial;
  const listeners = new Set<() => void>();
  const set = (next: T) => {
    if (Object.is(next, state)) return;
    state = next;
    listeners.forEach((listener) => listener());
  };
  return {
    get: () => state,
    set,
    update: (change) => set(change(state)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
};

export const useStore = <T,>(store: Store<T>) => useSyncExternalStore(store.subscribe, store.get, store.get);
