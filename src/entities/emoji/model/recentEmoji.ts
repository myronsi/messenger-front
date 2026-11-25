import { onAccountCleared } from '@/shared/auth/accountStorage';
import { useSyncExternalStore } from 'react';
import { parseEmojiTokens } from '@/shared/lib/customEmoji';

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

const write = (next: string[]) => {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    cache = [...cache];
  }
  listeners.forEach((listener) => listener());
};

export const rememberEmoji = (value: string) => {
  write([value, ...read().filter((item) => item !== value)].slice(0, MAX));
};

export const isRecentEmojiKnown = (item: string, known: ReadonlySet<string>) => {
  const id = parseEmojiTokens(item)[0]?.id;
  return !id || known.has(id);
};

export const forgetUnknownEmoji = (known: ReadonlySet<string>) => {
  const current = read();
  const next = current.filter((item) => isRecentEmojiKnown(item, known));
  if (next.length !== current.length) write(next);
};

export const resetRecentEmoji = () => {
  cache = null;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useStoredRecentEmoji = () => useSyncExternalStore(subscribe, read, read);

onAccountCleared(() => {
  cache = null;
  listeners.forEach((listener) => listener());
});
