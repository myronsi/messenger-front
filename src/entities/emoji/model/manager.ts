import { useSyncExternalStore } from 'react';

export type EmojiManagerRequest = { kind: 'packs'; packId?: string } | { kind: 'link'; slug: string } | null;

let current: EmojiManagerRequest = null;
const listeners = new Set<() => void>();

const set = (next: EmojiManagerRequest) => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const openEmojiPacks = (packId?: string) => set({ kind: 'packs', packId });
export const openEmojiPackLink = (slug: string) => set({ kind: 'link', slug });
export const closeEmojiManager = () => set(null);
export const useEmojiManagerRequest = () => useSyncExternalStore(subscribe, () => current, () => null);

const LINK = /^\/emoji\/([A-Za-z0-9]{8,32})\/?$/;

export const emojiSlugFromHref = (href: string) => {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return LINK.exec(url.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
};

export const emojiPackLink = (slug: string) => `${window.location.origin}/emoji/${slug}`;
