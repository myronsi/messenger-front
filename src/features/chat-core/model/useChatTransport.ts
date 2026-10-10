import type { Id } from '@/shared/lib/ids';
import { useRef } from 'react';
import { useChatRealtime } from '@/shared/api/realtimeSession';
import type { ChatTransport } from './types';

export const useChatTransport = (chatId: Id): ChatTransport => {
  const realtime = useChatRealtime(chatId);
  const pendingMessageIdsRef = useRef<Id[]>([]);
  return { realtime, pendingMessageIdsRef };
};
