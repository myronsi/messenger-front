import { useSyncExternalStore } from 'react';

export type StickerManagerRequest =
  | { kind: 'packs'; packId?: string }
  | { kind: 'make'; sourceUrl: string; name?: string }
  | null;

let current: StickerManagerRequest = null;
const listeners = new Set<() => void>();

const set = (next: StickerManagerRequest) => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const openStickerPacks = (packId?: string) => set({ kind: 'packs', packId });
export const makeStickerFrom = (sourceUrl: string, name?: string) => set({ kind: 'make', sourceUrl, name });
export const closeStickerManager = () => set(null);
export const useStickerManagerRequest = () => useSyncExternalStore(subscribe, () => current, () => null);
