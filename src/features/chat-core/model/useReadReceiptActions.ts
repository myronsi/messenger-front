import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import { Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import type { Message } from '@/entities/message';
import { useMarkChatReadMutation } from '@/entities/chat';

interface ReadReceiptActionsOptions {
  chatId: EntityId;
  username: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  currentUserIdRef: MutableRefObject<EntityId>;
}

type Reader = { username?: string; display_name?: string; avatar_url?: string };

export const useReadReceiptActions = ({ chatId, username, setMessages, currentUserIdRef }: ReadReceiptActionsOptions) => {
  const [markChatRead] = useMarkChatReadMutation();

  const applyReadReceiptBatch = useCallback((messageIds: EntityId[], readerUserId: EntityId, readAt: string, reader?: Reader) => {
    if (!messageIds.length || !readerUserId) return;
    const readMessageIds = new Set(messageIds);
    setMessages((previous) => previous.map((message) => {
      if (!readMessageIds.has(message.id)) return message;
      const readBy = message.read_by || [];
      if (readBy.some((read) => read.user_id === readerUserId)) return message;
      return {
        ...message,
        read_by: [...readBy, {
          user_id: readerUserId,
          username: reader?.username,
          display_name: reader?.display_name,
          avatar_url: reader?.avatar_url,
          read_at: readAt,
        }],
      };
    }));
  }, [setMessages]);

  const markMessagesRead = useCallback(async (messageIds: EntityId[]) => {
    const uniqueMessageIds = Array.from(new Set(messageIds.filter((messageId) => isPersistedId(messageId))));
    if (!uniqueMessageIds.length || !isPersistedId(currentUserIdRef.current)) return;
    const result = await markChatRead({ chatId, messageIds: uniqueMessageIds }).unwrap();
    applyReadReceiptBatch(
      result.read_message_ids || uniqueMessageIds,
      currentUserIdRef.current,
      result.read_at || new Date().toISOString(),
      { username }
    );
  }, [applyReadReceiptBatch, chatId, currentUserIdRef, markChatRead, username]);

  return { applyReadReceiptBatch, markMessagesRead };
};
