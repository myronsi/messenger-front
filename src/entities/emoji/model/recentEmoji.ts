import { useSyncExternalStore } from 'react';

const KEY = 'messenger.recentEmoji';
const MAX = 24;
const listeners = new Set<() => void>();
let cache: string[] | null = null;

const read = (): string[] => {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX) : [];
  } catch {
    cache = [];
  }
  return cache;
};

export const rememberEmoji = (value: string) => {
  cache = [value, ...read().filter((item) => item !== value)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    cache = [...cache];
  }
  listeners.forEach((listener) => listener());
};

export const resetRecentEmoji = () => {
  cache = null;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRecentEmoji = () => useSyncExternalStore(subscribe, read, read);
