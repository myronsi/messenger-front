import { useCallback, useState } from 'react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';



import {
  unescapeCurlyBraces, useChatSocket, useChatTransport, useLatest, useMessageEvents, useMessageHistory, useMessageSender,
  type SocketEvent,
} from '@/features/chat-core';
import { createDeleteChatAction } from './useChatActions';

export const useChat = (
  chatId: number,
  username: string,
  token: string,
  onBack: () => void,
  currentUserId = 0,
  firstUnreadMessageId?: number | null,
  onPresenceUpdate?: (update: { username: string; is_online: boolean; last_seen: string | null }) => void
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number; isMine: boolean } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser' | 'deleteMessageChoice';
    message?: string;
    consequences?: string[];
    onConfirm?: () => void;
    isMessageSender?: boolean;
    messageId?: number;
    onDeleteForMe?: () => void | Promise<void>;
    onDeleteForAll?: () => void;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const { translations, language } = useLanguage();
  const onBackRef = useLatest(onBack);
  const translationsRef = useLatest(translations);
  const currentUserIdRef = useLatest(currentUserId);
  const presenceUpdateRef = useLatest(onPresenceUpdate);
  const transport = useChatTransport();
  const { wsRef } = transport;

  const {
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    loadOlderMessages,
    loadNewerMessages,
    loadLatestMessages,
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
    handleResendMessage,
    handleFileUpload,
  } = useMessageSender({
    chatId, username, currentUserId, currentUserIdRef, translations, translationsRef, transport,
    setMessages, setModal, messageInput, setMessageInput, editingMessage, setEditingMessage, replyTo, setReplyTo,
  });

  const handleDeleteChat = createDeleteChatAction({ chatId, translations, onBack, setModal });

  const handleExtraEvent = useCallback((event: SocketEvent) => {
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
  });

  const scrollToMessage = (messageId: number) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 6000);
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
