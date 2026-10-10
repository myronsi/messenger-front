import { useState } from 'react';
import { Message, ModalState } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useDraftState } from '@/shared/hooks/useDraftState';
import { chatDraftKey } from '@/shared/lib/drafts';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';



import {
  unescapeCurlyBraces, useChatSocket, useChatTransport, useLatest, useMessageEvents, useMessageHistory, useMessageSender,
} from '@/features/chat-core';
import { useRealtimeEvents } from '@/shared/api/realtimeSession';
import { usernameOf } from '@/shared/lib/userDirectory';
import { createDeleteChatAction } from './useChatActions';
import type { Id } from '@/shared/lib/ids';

export const useChat = (
  chatId: Id,
  username: string,
  token: string,
  onBack: () => void,
  currentUserId: Id = '',
  firstUnreadMessageId?: Id | null,
  onPresenceUpdate?: (update: { username: string; is_online: boolean; last_seen: string | null }) => void,
  focusMessageId?: Id | null,
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: Id; isMine: boolean } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useDraftState(chatDraftKey(chatId), editingMessage === null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<Id | null>(null);
  const { translations, language } = useLanguage();
  const onBackRef = useLatest(onBack);
  const translationsRef = useLatest(translations);
  const currentUserIdRef = useLatest(currentUserId);
  const presenceUpdateRef = useLatest(onPresenceUpdate);
  const transport = useChatTransport(chatId);

  const {
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    loadOlderMessages,
    loadNewerMessages,
    loadLatestMessages,
    ensureMessageLoaded,
    catchUpAfterReconnect,
    markMessagesRead,
  } = useMessageHistory({
    chatId, token, username, firstUnreadMessageId, focusMessageId, messages, setMessages,
    currentUserIdRef, onBackRef, translationsRef, setModal,
  });

  const {
    markMessageFailed,
    createOptimisticUploadMessage,
    updateOptimisticUploadProgress,
    markOptimisticUploadFailed,
    settleOptimisticUpload,
    handleSendMessage,
    handleResendMessage,
    handleFileUpload,
    handleVoiceMessage,
  } = useMessageSender({
    chatId, username, currentUserId, currentUserIdRef, translations, translationsRef, transport,
    setMessages, setModal, messageInput, setMessageInput, editingMessage, setEditingMessage, replyTo, setReplyTo,
  });

  const handleDeleteChat = createDeleteChatAction({ chatId, translations, onBack, setModal });

  // Presence is connection-wide and names users by id.
  useRealtimeEvents((event) => {
    if (event.type !== 'presence') return;
    const presenceUsername = usernameOf(event.data.user_id);
    if (!presenceUsername) return;
    presenceUpdateRef.current?.({
      username: presenceUsername,
      is_online: event.data.is_online,
      last_seen: event.data.last_seen,
    });
  });

  const handleSocketEvent = useMessageEvents({
    chatId, transport, currentUserIdRef, translationsRef, onBackRef, setMessages, setModal,
    markMessageFailed, chatDeletedKey: 'chatDeleted',
  });

  useChatSocket({
    chatId, onEvent: handleSocketEvent,
    onConnectionFailed: () => setModal({ type: 'error', message: translationsRef.current.webSocketError }),
    onReconnected: catchUpAfterReconnect,
  });

  const scrollToMessage = (messageId: Id) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 6000);
    void ensureMessageLoaded(messageId);
  };

  const getFormattedDateLabel = (timestamp: string): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateLabel(timestamp, language, today, yesterday);
  };

  const getMessageTime = (timestamp: string): string => {
    return formatTime(timestamp, language);
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'message' && typeof message.content === 'string') {
      return unescapeCurlyBraces(message.content);
    }
    return undefined;
  };

  return {
    messages,
    messageInput,
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
    markMessagesRead,
    handleSendMessage,
    handleResendMessage,
    handleFileUpload,
    handleVoiceMessage,
    createOptimisticUploadMessage,
    updateOptimisticUploadProgress,
    markOptimisticUploadFailed,
    settleOptimisticUpload,
    handleDeleteChat,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
    chatRealtime: transport.realtime,
  };
};
