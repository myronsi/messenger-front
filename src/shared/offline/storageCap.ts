import { useSyncExternalStore } from 'react';

export const STORAGE_CAPS = ['100', '500', '2000', 'none'] as const;
export type StorageCap = typeof STORAGE_CAPS[number];

const KEY = 'messenger-offline-cap';
const DEFAULT_CAP: StorageCap = '500';
const listeners = new Set<() => void>();

export const getStorageCap = (): StorageCap => {
  try {
    const stored = localStorage.getItem(KEY);
    return STORAGE_CAPS.includes(stored as StorageCap) ? stored as StorageCap : DEFAULT_CAP;
  } catch {
    return DEFAULT_CAP;
  }
};

export const setStorageCap = (cap: StorageCap) => {
  try {
    localStorage.setItem(KEY, cap);
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
};

export const capBytes = (cap: StorageCap) => (cap === 'none' ? null : Number(cap) * 1024 * 1024);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useStorageCap = () => useSyncExternalStore(subscribe, getStorageCap, () => DEFAULT_CAP);
