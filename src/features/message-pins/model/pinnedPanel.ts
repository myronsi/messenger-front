import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';

let openChat: string | null = null;
const listeners = new Set<() => void>();

const set = (next: string | null) => {
  openChat = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const openPinnedPanel = (chatId: EntityId) => set(String(chatId));
export const closePinnedPanel = () => set(null);
export const usePinnedPanelOpen = (chatId: EntityId) => useSyncExternalStore(subscribe, () => openChat === String(chatId), () => false);
