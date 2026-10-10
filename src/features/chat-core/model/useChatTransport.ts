import type { Id } from '@/shared/lib/ids';
import { useCallback, useRef, useState } from 'react';
import type { ChatTransport, OutgoingPayload } from './types';

export const useChatTransport = (): ChatTransport => {
  const wsRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<OutgoingPayload[]>([]);
  const pendingMessageIdsRef = useRef<Id[]>([]);
  const [connectionRetryKey, setConnectionRetryKey] = useState(0);
  const requestReconnect = useCallback(() => setConnectionRetryKey((key) => key + 1), []);
  return { wsRef, messageQueueRef, pendingMessageIdsRef, connectionRetryKey, requestReconnect };
};