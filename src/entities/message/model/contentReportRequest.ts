import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';

export type ContentReportRequest =
  | { kind: 'message'; chatId: EntityId; messageId: EntityId; name: string }
  | { kind: 'group'; chatId: EntityId; name: string };

let current: ContentReportRequest | null = null;
const listeners = new Set<() => void>();

const set = (next: ContentReportRequest | null) => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const requestContentReport = (request: ContentReportRequest) => set(request);
export const closeContentReport = () => set(null);
export const useContentReportRequest = () => useSyncExternalStore(subscribe, () => current, () => null);
