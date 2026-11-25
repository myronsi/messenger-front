import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { RichSend } from './types';

export type AttachKind = RichSend['type'];

export interface AttachRequest {
  kind: AttachKind;
  chatId: EntityId;
  onSend: (send: RichSend) => void;
}

let current: AttachRequest | null = null;
const listeners = new Set<() => void>();

const set = (next: AttachRequest | null) => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const requestAttach = (request: AttachRequest) => set(request);
export const closeAttach = () => set(null);
export const useAttachRequest = () => useSyncExternalStore(subscribe, () => current, () => null);
