import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Message, PinnedMessage } from './types';

export interface PinChangeRequest {
  chatId: EntityId;
  message: Message;
  pin: PinnedMessage | null;
  key: number;
}

let current: PinChangeRequest | null = null;
let nextKey = 0;
const listeners = new Set<() => void>();

const set = (next: PinChangeRequest | null) => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const requestPinChange = (request: Omit<PinChangeRequest, 'key'>) => {
  nextKey += 1;
  set({ ...request, key: nextKey });
};
export const closePinChange = () => set(null);
export const usePinChangeRequest = () => useSyncExternalStore(subscribe, () => current, () => null);
