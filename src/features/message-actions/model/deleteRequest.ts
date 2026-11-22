import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';

export interface MessageDeleteRequest {
  chatId: EntityId;
  forEveryone: boolean;
  direct: boolean;
  deleteForMe: () => void;
  deleteForEveryone: () => void;
}

let current: MessageDeleteRequest | null = null;
const listeners = new Set<() => void>();

const set = (next: MessageDeleteRequest | null) => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const requestMessageDelete = (request: MessageDeleteRequest) => set(request);
export const closeMessageDelete = () => set(null);
export const useMessageDeleteRequest = () => useSyncExternalStore(subscribe, () => current, () => null);
