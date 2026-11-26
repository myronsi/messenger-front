import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';

let forwarding: EntityId | null = null;
const listeners = new Set<() => void>();

export const requestMediaForward = (messageId: EntityId | null) => {
  forwarding = messageId;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useMediaForwardRequest = () => useSyncExternalStore(subscribe, () => forwarding, () => null);
