import type { EntityId } from '@/shared/api/entityId';
import { useCallback, useMemo, useRef, useState, type SetStateAction } from 'react';
import { ContextMenuState, Message, ModalState, placeFailedMessagesByTime, useConversationMessages } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';



import {
  unescapeCurlyBraces, useChatSocket, useChatTransport, useLatest, useMessageEvents, useMessageHistory, useMessageSender,
  useUnsentMessageStorage, useServerOutbox,
  type ServerEvent,
} from '@/features/chat-core';
import type { ComposerDraftHandle } from '@/features/message-composer';
import { createDeleteChatAction } from './useChatActions';

const renderMessageContent = (message: Message) => (
  message.type === 'message' && typeof message.content === 'string' ? unescapeCurlyBraces(message.content) : undefined
);

export const useChat = (
  chatId: EntityId,
  username: string,
  token: string,
  onBack: () => void,
  currentUserId: EntityId = 0,
  firstUnreadMessageId?: EntityId | null,
  onPresenceUpdate?: (update: { username: string; is_online: boolean; last_seen: string | null }) => void
) => {
  const { messages, setMessages } = useConversationMessages(chatId);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const composerDraftRef = useRef<ComposerDraftHandle | null>(null);
  const getMessageInput = useCallback(() => composerDraftRef.current?.get() ?? '', []);
  const setMessageInput = useCallback((value: SetStateAction<string>) => composerDraftRef.current?.set(value), []);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<EntityId | null>(null);
  const { translations, language } = useLanguage();
  const onBackRef = useLatest(onBack);
  const translationsRef = useLatest(translations);
  const currentUserIdRef = useLatest(currentUserId);
  const presenceUpdateRef = useLatest(onPresenceUpdate);
  const transport = useChatTransport();
  const { wsRef } = transport;

  const {
    preview,
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    loadOlderMessages,
    loadNewerMessages,
    loadLatestMessages,
    loadMessagesAround,
    catchUpAfterReconnect,
    markMessagesRead,
  } = useMessageHistory({
    chatId, token, username, firstUnreadMessageId, messages, setMessages,
    currentUserIdRef, onBackRef, translationsRef, setModal,
  });

  const {
    markMessageFailed,
    markLatestPendingMessageFailed,
    createOptimisticUploadMessage,
    updateOptimisticUploadProgress,
    markOptimisticUploadFailed,
    settleOptimisticUpload,
    handleSendMessage,
    handleSendSticker,
    handleResendMessage,
    handleFileUpload,
    resendUnconfirmed,
    resendPending,
  } = useMessageSender({
    chatId, username, currentUserId, currentUserIdRef, translations, translationsRef, transport,
    setMessages, getMessageInput, setMessageInput, editingMessage, setEditingMessage, replyTo, setReplyTo,
  });

  useUnsentMessageStorage({ chatId, messages, setMessages, resend: resendPending, notConfirmed: translations.messageDeliveryNotConfirmed });
  useServerOutbox({ chatId, setMessages, username, senderId: currentUserId, translationsRef });

  const handleDeleteChat = createDeleteChatAction({ chatId, translations, onBack, setModal });

  const handleExtraEvent = useCallback((event: ServerEvent) => {
    if (event.type === 'presence_update' && event.username) {
      presenceUpdateRef.current?.({
        username: event.username,
        is_online: !!event.is_online,
        last_seen: event.last_seen || null,
      });
    }
  }, [presenceUpdateRef]);

  const handleSocketEvent = useMessageEvents({
    chatId, username, transport, currentUserIdRef, translationsRef, onBackRef, setMessages, setModal,
    markMessageFailed, markLatestPendingMessageFailed, chatDeletedKey: 'chatDeleted', onExtraEvent: handleExtraEvent,
  });

  useChatSocket({
    chatId, token, transport, onEvent: handleSocketEvent,
    onConnectionFailed: () => setModal({ type: 'error', message: translationsRef.current.webSocketError }),
    onReconnected: () => { resendUnconfirmed(); void catchUpAfterReconnect(); },
    onOpened: () => { void catchUpAfterReconnect(true); },
  });

  const scrollToMessage = useCallback((messageId: EntityId) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 6000);
  }, []);

  const getFormattedDateLabel = useCallback((timestamp: string): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateLabel(timestamp, language, today, yesterday);
  }, [language]);

  const visibleMessages = useMemo(() => placeFailedMessagesByTime(preview ?? messages), [preview, messages]);

  const getMessageTime = useCallback((timestamp: string): string => formatTime(timestamp, language), [language]);

  return {
    messages: visibleMessages,
    composerDraftRef,
    setMessageInput,
    contextMenu,
    setContextMenu,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    selectedUser,
    setSelectedUser,
    modal,
    setModal,
    highlightedMessageId,
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    scrollToMessage,
    loadOlderMessages,
    loadNewerMessages,
    loadLatestMessages,
    loadMessagesAround,
    markMessagesRead: preview ? undefined : markMessagesRead,
    handleSendMessage,
    handleSendSticker,
    handleResendMessage,
    handleFileUpload,
    createOptimisticUploadMessage,
    updateOptimisticUploadProgress,
    markOptimisticUploadFailed,
    settleOptimisticUpload,
    handleDeleteChat,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
    wsRef,
  };
};
