import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { toAppMessage, useLocalMessageDeletion, removeMessageAnimated } from '@/entities/message';
import {
  addReaction, addReadReceiptUpTo, applyMessageEdit, buildIncomingMessage, confirmSentMessage, mergeIncomingMessage, removeReaction,
} from './messageUpdates';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { ChatServerEvent } from './socketEvents';
import type { ChatTransport, SetMessages, ShowError } from './types';
import type { Id } from '@/shared/lib/ids';

interface MessageEventsOptions {
  chatId: Id;
  transport: ChatTransport;
  currentUserIdRef: MutableRefObject<Id>;
  translationsRef: MutableRefObject<Translations>;
  onBackRef: MutableRefObject<() => void>;
  setMessages: SetMessages;
  setModal: ShowError;
  markMessageFailed: (messageId: Id, message?: string) => boolean;
  // Translation key shown when the whole chat is deleted (differs for one-to-one and group chats).
  chatDeletedKey: 'chatDeleted' | 'groupDeleted';
  // Events that only one chat kind cares about (typing, group updates, ...).
  onExtraEvent?: (event: ChatServerEvent) => void;
}

// Applies the events of the v2 socket that are the same for every chat kind; the handler is for useChatSocket.
export const useMessageEvents = ({
  chatId, transport, currentUserIdRef, translationsRef, onBackRef, setMessages, setModal,
  markMessageFailed, chatDeletedKey, onExtraEvent,
}: MessageEventsOptions) => {
  useLocalMessageDeletion(chatId, setMessages);
  const { pendingMessageIdsRef } = transport;

  const forgetPending = useCallback((localId: Id) => {
    pendingMessageIdsRef.current = pendingMessageIdsRef.current.filter((id) => id !== localId);
  }, [pendingMessageIdsRef]);

  return useCallback((event: ChatServerEvent) => {
    switch (event.type) {
      case 'message': {
        const incoming = buildIncomingMessage(event.data.message, currentUserIdRef.current);
        setMessages((previous) => mergeIncomingMessage(previous, incoming, forgetPending));
        return;
      }
      case 'ack': {
        // A sent message's local id (its client_temp_id) becomes the stored id.
        const data = event.data;
        if (typeof data.message_id === 'string' && typeof data.created_at === 'string') {
          const { message_id: messageId, created_at: createdAt } = data;
          forgetPending(event.client_temp_id);
          setMessages((previous) => confirmSentMessage(previous, event.client_temp_id, messageId, createdAt));
        }
        return;
      }
      case 'edit': {
        const edited = toAppMessage(event.data.message);
        setMessages((previous) => applyMessageEdit(previous, edited.id, edited.content, edited.edited_at ?? undefined));
        return;
      }
      case 'delete':
        // "me" reaches only this user's other devices: there it is gone too.
        removeMessageAnimated(setMessages, event.data.message_id);
        return;
      case 'reaction_add':
        setMessages((previous) => addReaction(previous, event.data.message_id, {
          user_id: event.data.reaction.user_id,
          reaction: event.data.reaction.emoji,
        }));
        return;
      case 'reaction_remove':
        setMessages((previous) => removeReaction(previous, event.data.message_id, event.data.reaction.user_id, event.data.reaction.emoji));
        return;
      case 'read':
        setMessages((previous) => addReadReceiptUpTo(previous, event.data.message_id, event.data.user_id, event.data.read_at));
        return;
      case 'error':
        // An event of this chat was refused; a sent message carries its local id as client_temp_id.
        if (event.client_temp_id && pendingMessageIdsRef.current.includes(event.client_temp_id)) {
          forgetPending(event.client_temp_id);
          markMessageFailed(event.client_temp_id, event.data.message ?? event.data.code);
        } else {
          setModal({ type: 'error', message: event.data.message || translationsRef.current.webSocketError });
        }
        return;
      case 'chat_deleted':
        setModal({ type: 'error', message: translationsRef.current[chatDeletedKey] });
        setTimeout(() => onBackRef.current(), 1000);
        return;
      default:
        onExtraEvent?.(event);
    }
  }, [
    chatDeletedKey, currentUserIdRef, forgetPending, markMessageFailed, onBackRef,
    onExtraEvent, pendingMessageIdsRef, setMessages, setModal, translationsRef,
  ]);
};
