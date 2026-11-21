import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';

let pending: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

const publish = (next: Set<string>) => {
  pending = next;
  listeners.forEach((listener) => listener());
};

export const hideChatUntilUndo = (chatId: EntityId) => publish(new Set(pending).add(String(chatId)));

export const showChatAgain = (chatId: EntityId) => {
  const next = new Set(pending);
  if (next.delete(String(chatId))) publish(next);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePendingChatRemovals = () => useSyncExternalStore(subscribe, () => pending, () => pending);
