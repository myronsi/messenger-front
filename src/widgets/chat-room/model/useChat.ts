import { useState, useEffect, useRef } from 'react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';



import { useChatWebSocket } from './useChatWebSocket';
import { useChatHistory } from './useChatHistory';
import { createChatActions } from './useChatActions';

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
  const [connectionRetryKey, setConnectionRetryKey] = useState(0);
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
  const onBackRef = useRef(onBack);
  const translationsRef = useRef(translations);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const messageQueueRef = useRef<Array<any>>([]);
  const pendingMessageIdsRef = useRef<number[]>([]);
  const currentUserIdRef = useRef(currentUserId);
  const unescapeCurlyBraces = (text: string): string => {
    return text.replace(/\\{/g, '{').replace(/\\}/g, '}');
  };

  useEffect(() => {
    onBackRef.current = onBack;
    translationsRef.current = translations;
    currentUserIdRef.current = currentUserId;
  }, [onBack, translations, currentUserId]);

  const {
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    loadOlderMessages,
    loadNewerMessages,
    markMessagesRead,
    applyReadReceiptBatch,
  } = useChatHistory({
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
    handleDeleteChat,
  } = createChatActions({
    chatId, username, currentUserId, currentUserIdRef, translations, translationsRef,
    onBack, setModal, setMessages, messageInput, setMessageInput, editingMessage,
    setEditingMessage, replyTo, setReplyTo, wsRef, messageQueueRef,
    pendingMessageIdsRef, setConnectionRetryKey,
  });

  useChatWebSocket({
    chatId, token, username, onPresenceUpdate, connectionRetryKey, wsRef, reconnectAttempts,
    messageQueueRef, pendingMessageIdsRef, currentUserIdRef, translationsRef,
    setMessages, setModal, applyReadReceiptBatch, markMessageFailed, markLatestPendingMessageFailed,
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
