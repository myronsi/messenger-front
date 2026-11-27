import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';

export interface ActiveImport {
  importId: EntityId;
  chatId: EntityId;
  done: number;
  total: number;
  waitingSeconds: number;
}

let current: ActiveImport | null = null;
const listeners = new Set<() => void>();

export const setActiveImport = (next: ActiveImport | null) => {
  current = next;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useActiveImport = () => useSyncExternalStore(subscribe, () => current, () => null);

export const importPercent = (done: number, total: number) => (total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0);
