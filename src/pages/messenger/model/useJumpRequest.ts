import { useCallback, useEffect, useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';

export interface JumpRequest {
  chatId: EntityId;
  messageId: EntityId;
  key: number;
}

export const useJumpRequest = (openChatId?: EntityId | null) => {
  const [request, setRequest] = useState<JumpRequest | null>(null);
  useEffect(() => { setRequest(null); }, [openChatId]);
  const requestJump = useCallback((chatId: EntityId, messageId: EntityId) => setRequest({ chatId, messageId, key: Date.now() }), []);
  const requestFor = (chatId?: EntityId | null) => (request && chatId != null && String(request.chatId) === String(chatId) ? request : null);
  return { requestJump, requestFor };
};
