import { Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import type { Message } from '@/entities/message';
import { useMarkChatReadMutation } from '@/entities/chat';
import type { Id } from '@/shared/lib/ids';
import { isServerId } from '@/shared/lib/ids';

interface OwnReadReceiptsOptions {
  chatId: Id;
  username: string;
  currentUserIdRef: MutableRefObject<Id>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

// Marks messages read by the current user and adds read receipts to the loaded messages.
export const useOwnReadReceipts = ({ chatId, username, currentUserIdRef, setMessages }: OwnReadReceiptsOptions) => {
  const [markChatRead] = useMarkChatReadMutation();

  const applyReadReceiptBatch = useCallback((
    messageIds: Id[],
    readerUserId: Id,
    readAt: string,
    reader?: { username?: string; display_name?: string; avatar_url?: string }
  ) => {
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

  const markMessagesRead = useCallback(async (messageIds: Id[]) => {
    const uniqueMessageIds = Array.from(new Set(messageIds.filter((messageId) => isServerId(messageId))));
    if (!uniqueMessageIds.length || !currentUserIdRef.current) return;
    const result = await markChatRead({ chatId, messageIds: uniqueMessageIds }).unwrap();
    applyReadReceiptBatch(
      result.read_message_ids || uniqueMessageIds,
      currentUserIdRef.current,
      result.read_at || new Date().toISOString(),
      { username }
    );
  }, [applyReadReceiptBatch, chatId, currentUserIdRef, markChatRead, username]);

  return { markMessagesRead, applyReadReceiptBatch };
};
