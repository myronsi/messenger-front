import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Message } from './types';

export const isImportedMessage = (message: Pick<Message, 'import'>) => !!message.import;

export const importedSenderName = (message: Pick<Message, 'import'>): string | null => (
  message.import?.sender_state === 'unconfirmed' ? message.import.sender_name || '?' : null
);

export const isConfirmedImport = (message: Pick<Message, 'import'>) => message.import?.sender_state === 'confirmed';

export interface ImportActionRequest {
  kind: 'notMine';
  chatId: EntityId;
  message: Message;
  key: number;
}

let current: ImportActionRequest | null = null;
let nextKey = 0;
const listeners = new Set<() => void>();

const set = (next: ImportActionRequest | null) => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const requestImportAction = (request: Omit<ImportActionRequest, 'key'>) => {
  nextKey += 1;
  set({ ...request, key: nextKey });
};
export const closeImportAction = () => set(null);
export const useImportActionRequest = () => useSyncExternalStore(subscribe, () => current, () => null);
