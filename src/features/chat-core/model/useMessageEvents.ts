import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { useLocalMessageDeletion, removeMessageAnimated } from '@/entities/message';
import {
  addReaction, addReadReceipts, applyMessageEdit, buildMessageFromSocketEvent, mergeIncomingMessage, removeReaction,
} from './messageUpdates';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { ReadBatchEvent, ReadEvent, ServerEvent } from './socketEvents';
import type { ChatTransport, SetMessages, ShowError } from './types';

interface MessageEventsOptions {
  chatId: number;
  username: string;
  transport: ChatTransport;
  currentUserIdRef: MutableRefObject<number>;
  translationsRef: MutableRefObject<Translations>;
  onBackRef: MutableRefObject<() => void>;
  setMessages: SetMessages;
  setModal: ShowError;
  markMessageFailed: (messageId: number, message?: string) => boolean;
  markLatestPendingMessageFailed: (message?: string) => boolean;
  // Translation key shown when the whole chat is deleted (differs for one-to-one and group chats).
  chatDeletedKey: 'chatDeleted' | 'groupDeleted';
  // Events that only one chat kind cares about (presence, group updates, ...).
  onExtraEvent?: (event: ServerEvent, socket: WebSocket) => void;
}

const readerFrom = (event: ReadEvent | ReadBatchEvent) => ({
  username: event.username,
  display_name: event.display_name,
  avatar_url: event.avatar_url,
});

// Applies the socket events that are identical for every chat kind and returns the handler for useChatSocket.
export const useMessageEvents = ({
  chatId, username, transport, currentUserIdRef, translationsRef, onBackRef, setMessages, setModal,
  markMessageFailed, markLatestPendingMessageFailed, chatDeletedKey, onExtraEvent,
}: MessageEventsOptions) => {
  useLocalMessageDeletion(chatId, setMessages);
  const { pendingMessageIdsRef } = transport;

  return useCallback((event: ServerEvent, socket: WebSocket) => {
    switch (event.type) {
      case 'message':
      case 'file': {
        if (event.data?.chat_id != null && event.data.chat_id !== chatId) return;
        const incoming = buildMessageFromSocketEvent(event, { currentUserId: currentUserIdRef.current, username });
        setMessages((previous) => mergeIncomingMessage(previous, incoming, (tempId) => {
          pendingMessageIdsRef.current = pendingMessageIdsRef.current.filter((id) => id !== tempId);
        }));
        return;
      }
      case 'edit':
        setMessages((previous) => applyMessageEdit(previous, event.message_id, event.new_content, event.timestamp));
        return;
      case 'delete':
        removeMessageAnimated(setMessages, event.message_id);
        return;
      case 'reaction_add':
        setMessages((previous) => addReaction(previous, event.message_id, {
          user_id: event.user_id,
          username: event.username,
          display_name: event.display_name,
          avatar_url: event.avatar_url,
          reaction: event.reaction,
        }));
        return;
      case 'reaction_remove':
        setMessages((previous) => removeReaction(previous, event.message_id, event.user_id, event.reaction));
        return;
      case 'is_read':
      case 'chat_list_read':
        setMessages((previous) => addReadReceipts(
          previous,
          event.message_id ? [event.message_id] : [],
          event.user_id || event.reader_user_id || (event.type === 'is_read' ? event.id : undefined) || 0,
          event.read_at || event.timestamp || new Date().toISOString(),
          readerFrom(event)
        ));
        return;
      case 'chat_read_batch':
        setMessages((previous) => addReadReceipts(
          previous,
          event.message_ids || [],
          event.reader_user_id || event.user_id || 0,
          event.read_at || event.timestamp || new Date().toISOString(),
          readerFrom(event)
        ));
        return;
      case 'error':
        if (event.message_id) markMessageFailed(event.message_id, event.message);
        else if (!markLatestPendingMessageFailed(event.message)) setModal({ type: 'error', message: event.message ?? '' });
        return;
      case 'chat_deleted':
        if (event.chat_id != null && event.chat_id !== chatId) return;
        setModal({ type: 'error', message: translationsRef.current[chatDeletedKey] });
        socket.close(1000, 'Chat deleted');
        setTimeout(() => onBackRef.current(), 1000);
        return;
      default:
        onExtraEvent?.(event, socket);
    }
  }, [
    chatDeletedKey, chatId, currentUserIdRef, markLatestPendingMessageFailed, markMessageFailed, onBackRef,
    onExtraEvent, pendingMessageIdsRef, setMessages, setModal, translationsRef, username,
  ]);
};