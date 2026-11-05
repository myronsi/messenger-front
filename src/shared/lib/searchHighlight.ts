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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const splitByQuery = (text: string, query: string): { text: string; match: boolean }[] => {
  if (!query) return [{ text, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const found of text.matchAll(new RegExp(escapeRegExp(query), 'giu'))) {
    if (found.index > cursor) parts.push({ text: text.slice(cursor, found.index), match: false });
    parts.push({ text: found[0], match: true });
    cursor = found.index + found[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts.length ? parts : [{ text, match: false }];
};
