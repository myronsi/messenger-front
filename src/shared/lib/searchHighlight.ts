import { useSyncExternalStore } from 'react';

let current = '';
const listeners = new Set<() => void>();

export const setSearchHighlight = (query: string) => {
  const next = query.trim();
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useSearchHighlight = () => useSyncExternalStore(subscribe, () => current, () => '');

export const splitByQuery = (text: string, query: string): { text: string; match: boolean }[] => {
  if (!query) return [{ text, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  let cursor = 0;
  for (let index = lower.indexOf(needle); index >= 0; index = lower.indexOf(needle, index + needle.length)) {
    if (index > cursor) parts.push({ text: text.slice(cursor, index), match: false });
    parts.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts.length ? parts : [{ text, match: false }];
};
