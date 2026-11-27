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

export const importPercent = (done: number, total: number) => (total > 0 ? Math.min(1000, Math.floor((done * 1000) / total)) / 10 : 0);

export const formatImportPercent = (done: number, total: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(importPercent(done, total) / 100);
