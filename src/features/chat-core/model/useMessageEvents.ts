import type { SocketSender } from '@/shared/api/realtime';
import type { EntityId } from '@/shared/api/entityId';
import { compareIds, isPersistedId } from '@/shared/api/entityId';
import { isGoApi } from '@/shared/api/goSocket';
import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { SERVER_KEPT_ERRORS, useLocalMessageDeletion, removeMessageAnimated } from '@/entities/message';
import {
  addReaction, addReadReceipts, applyMessageEdit, buildMessageFromSocketEvent, mergeIncomingMessage, removeReaction,
} from './messageUpdates';
import { closeForGood } from '@/shared/api/reconnect';
import { markServerKept } from './serverOutbox';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { ReadBatchEvent, ReadEvent, ServerEvent } from './socketEvents';
import type { ChatTransport, SetMessages, ShowError } from './types';

interface MessageEventsOptions {
  chatId: EntityId;
  username: string;
  transport: ChatTransport;
  currentUserIdRef: MutableRefObject<EntityId>;
  translationsRef: MutableRefObject<Translations>;
  onBackRef: MutableRefObject<() => void>;
  setMessages: SetMessages;
  setModal: ShowError;
  markMessageFailed: (messageId: EntityId, message?: string) => boolean;
  markLatestPendingMessageFailed: (message?: string) => boolean;
  // Translation key shown when the whole chat is deleted (differs for one-to-one and group chats).
  chatDeletedKey: 'chatDeleted' | 'groupDeleted';
  // Events that only one chat kind cares about (presence, group updates, ...).
  onExtraEvent?: (event: ServerEvent, socket: SocketSender) => void;
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

  return useCallback((event: ServerEvent, socket: SocketSender) => {
    switch (event.type) {
      case 'ack':
        pendingMessageIdsRef.current = pendingMessageIdsRef.current.filter(id => String(id) !== String(event.client_temp_id));
        setMessages(previous => {
          const exists = previous.some(message => String(message.id) === String(event.message_id));
          return previous.flatMap(message => {
            if (isPersistedId(message.id) || String(message.client_temp_id ?? message.id) !== String(event.client_temp_id)) return [message];
            return exists ? [] : [{ ...message, id: event.message_id, timestamp: event.timestamp || message.timestamp,
              delivery_error: undefined, is_live: true }];
          });
        });
        return;
      case 'message':
      case 'file': {
        if (event.data?.chat_id != null && String(event.data.chat_id) !== String(chatId)) return;
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
      case 'history_cleared':
        setMessages((previous) => previous.filter((message) => !isPersistedId(message.id) || BigInt(message.id) > BigInt(event.before_message_id)));
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
          event.message_id ? (isGoApi()
            ? previous.filter(message => isPersistedId(message.id) && compareIds(message.id, event.message_id!) <= 0).map(message => message.id)
            : [event.message_id]) : [],
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
        if (event.operation_error) setModal({ type: 'error', message: event.message ?? '' });
        else if (event.message_id) {
          markMessageFailed(event.message_id, event.message);
          if (event.code && SERVER_KEPT_ERRORS.has(event.code)) setMessages(previous => markServerKept(previous, event.message_id!));
        }
        else if (!markLatestPendingMessageFailed(event.message)) setModal({ type: 'error', message: event.message ?? '' });
        return;
      case 'chat_deleted':
        if (event.chat_id != null && String(event.chat_id) !== String(chatId)) return;
        setModal({ type: 'error', message: translationsRef.current[chatDeletedKey] });
        closeForGood(socket, 'Chat deleted');
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
