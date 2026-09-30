import React, { useCallback, useEffect } from 'react';
import type { FileMessageContent, Message, MessageHistoryResponse, ModalState } from '@/entities/message';
import type { GroupDetails } from './GroupProfileTypes';
import type { GroupTranslations } from './groupChatTypes';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { authFetch } from '@/shared/auth/session';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { normalizeHistoryMessages, prependUniqueMessages } from '@/entities/message';
import { getLocalUploadFileType, MESSAGE_PAGE_SIZE } from './groupChatUtils';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface ContextMenuState { x: number; y: number; messageId: number; isMine: boolean; isClosing?: boolean; }
interface ReactionMenuState { message: Message; x: number; y: number; isClosing?: boolean; }
interface UseGroupMessageActionsArgs {
  chatId: number; token: string; username: string; language: 'en' | 'ru'; translations: GroupTranslations;
  currentUserId: number; currentUserIdRef: React.MutableRefObject<number>;
  messages: Message[]; setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isOwnMessage: (message: Message) => boolean; groupDetails: Pick<GroupDetails, 'permissions'> | null;
  setModal: React.Dispatch<React.SetStateAction<ModalState | null>>;
  oldestMessageId: number | null; hasMoreMessages: boolean; isLoadingOlderMessagesRef: React.MutableRefObject<boolean>;
  setHighlightedMessageId: React.Dispatch<React.SetStateAction<number | null>>;
  setTempHighlightedMessageId: React.Dispatch<React.SetStateAction<number | null>>;
  setIsLoadingOlderMessages: React.Dispatch<React.SetStateAction<boolean>>; setHasMoreMessages: React.Dispatch<React.SetStateAction<boolean>>;
  setOldestMessageId: React.Dispatch<React.SetStateAction<number | null>>; onBack: () => void;
  contextMenu: ContextMenuState | null; reactionMenu: ReactionMenuState | null;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  setReactionMenu: React.Dispatch<React.SetStateAction<ReactionMenuState | null>>; setIsClosing: React.Dispatch<React.SetStateAction<boolean>>;
  messageRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  messageJumpRequest?: { messageId: number; key: number } | null;
  wsRef: React.MutableRefObject<WebSocket | null>;
  messageInput: string; setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  replyTo: Message | null; setReplyTo: React.Dispatch<React.SetStateAction<Message | null>>;
  editingMessage: Message | null; setEditingMessage: React.Dispatch<React.SetStateAction<Message | null>>;
}

export const useGroupMessageActions = ({ chatId, token, username, language, translations, currentUserId, currentUserIdRef, setMessages, isOwnMessage, groupDetails, setHighlightedMessageId, setTempHighlightedMessageId, setModal, oldestMessageId, hasMoreMessages, isLoadingOlderMessagesRef, setIsLoadingOlderMessages, setHasMoreMessages, setOldestMessageId, onBack, contextMenu, reactionMenu, setContextMenu, setReactionMenu, setIsClosing, messageRefs, messageJumpRequest, wsRef, messageInput, setMessageInput, replyTo, setReplyTo, editingMessage, setEditingMessage }: UseGroupMessageActionsArgs) => {
  const createOptimisticUploadMessage = useCallback((
    file: Blob,
    fileName: string,
    fileType = getLocalUploadFileType(fileName, file.type),
    caption = ''
  ) => {
    const tempId = -Date.now();
    const objectUrl = URL.createObjectURL(file);
    const content: FileMessageContent = {
      file_url: objectUrl,
      file_name: fileName,
      file_type: fileType,
      file_size: file.size,
      ...(caption.trim() ? { caption: caption.trim() } : {}),
    };
    const optimisticMessage: Message = {
      id: tempId,
      client_temp_id: tempId,
      local_object_url: objectUrl,
      upload_status: 'uploading',
      upload_progress: 1,
      sender_id: currentUserIdRef.current || currentUserId || undefined,
      is_own: true,
      sender: username,
      sender_username: username,
      content,
      timestamp: new Date().toISOString(),
      avatar_url: DEFAULT_AVATAR,
      reply_to: null,
      is_deleted: false,
      type: 'file',
      reactions: [],
      read_by: [],
    };

    setMessages((current) => [...current, optimisticMessage]);
    return tempId;
  }, [currentUserId, currentUserIdRef, setMessages, username]);

  const updateOptimisticUploadProgress = useCallback((messageId: number, percent: number) => {
    setMessages((current) => current.map((message) => (
      message.id === messageId
        ? { ...message, upload_progress: Math.max(1, Math.min(99, Math.round(percent))) }
        : message
    )));
  }, [setMessages]);

  const markOptimisticUploadFailed = useCallback((messageId: number, errorMessage?: string) => {
    setMessages((current) => current.map((message) => (
      message.id === messageId
        ? {
            ...message,
            upload_status: 'failed',
            delivery_error: errorMessage || translations.errorLoading || 'Upload failed',
          }
        : message
    )));
  }, [setMessages, translations.errorLoading]);

  const settleOptimisticUpload = useCallback((messageId: number) => {
    updateOptimisticUploadProgress(messageId, 99);
  }, [updateOptimisticUploadProgress]);

  const canDeleteMessage = useCallback((message: Message) => {
    return isOwnMessage(message) || !!groupDetails?.permissions?.can_delete_any_message;
  }, [groupDetails?.permissions?.can_delete_any_message, isOwnMessage]);

  const getFormattedDateLabel = useCallback((timestamp: string): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateLabel(timestamp, language, today, yesterday);
  }, [language]);

  const getMessageTime = useCallback((timestamp: string): string => {
    return formatTime(timestamp, language);
  }, [language]);

  const loadOlderMessages = useCallback(async () => {
    if (!token || !oldestMessageId || !hasMoreMessages || isLoadingOlderMessagesRef.current) return;
    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);

    try {
      const params = new URLSearchParams({
        limit: String(MESSAGE_PAGE_SIZE),
        before_id: String(oldestMessageId),
      });
      const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data: MessageHistoryResponse = await response.json();
        const olderMessages = normalizeHistoryMessages(data.history);
        setMessages((prev) => prependUniqueMessages(prev, olderMessages));
        setHasMoreMessages(!!data.has_more);
        if (olderMessages.length > 0) setOldestMessageId(olderMessages[0].id);
      } else if (response.status === 401) {
        setModal({ type: 'error', message: translations.loginRequired });
        setTimeout(onBack, 1000);
      } else if (response.status === 403) {
        onBack();
      } else {
        throw new Error(await response.text());
      }
    } catch (error) {
      console.error(`Error loading older group messages for ${chatId}:`, error);
      setModal({ type: 'error', message: translations.errorLoadingMessages });
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [chatId, hasMoreMessages, isLoadingOlderMessagesRef, oldestMessageId, onBack, setHasMoreMessages, setIsLoadingOlderMessages, setMessages, setModal, setOldestMessageId, token, translations]);

  const closeMenus = useCallback(() => {
    setContextMenu(null);
    setReactionMenu(null);
    setIsClosing(false);
  }, [setContextMenu, setIsClosing, setReactionMenu]);

  const openMenus = useCallback((message: Message, event: React.MouseEvent) => {
    setReactionMenu({ message, x: event.clientX, y: event.clientY - 45 });
    setContextMenu({ x: event.clientX, y: event.clientY, messageId: message.id, isMine: isOwnMessage(message) });
  }, [isOwnMessage, setContextMenu, setReactionMenu]);

  const handleMessageClick = useCallback((event: React.MouseEvent, message: Message) => {
    if (window.innerWidth < 768 || event.type === 'contextmenu') {
      event.preventDefault();
      event.stopPropagation();
      if (contextMenu?.messageId === message.id && reactionMenu?.message.id === message.id) {
        setIsClosing(true);
        setTimeout(closeMenus, 200);
        return;
      }
      if (contextMenu || reactionMenu) {
        setIsClosing(true);
        setTimeout(() => {
          closeMenus();
          openMenus(message, event);
        }, 200);
        return;
      }
      openMenus(message, event);
    }
  }, [closeMenus, contextMenu, openMenus, reactionMenu, setIsClosing]);

  const scrollToMessage = useCallback((messageId: number) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 6000);
  }, [setHighlightedMessageId]);

  const jumpToSearchResult = useCallback((messageId: number) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTempHighlightedMessageId(messageId);
      setTimeout(() => setTempHighlightedMessageId(null), 2000);
      return;
    }
    scrollToMessage(messageId);
  }, [messageRefs, scrollToMessage, setTempHighlightedMessageId]);

  const messageJumpRequestRef = React.useRef(messageJumpRequest);
  messageJumpRequestRef.current = messageJumpRequest;

  useEffect(() => {
    const request = messageJumpRequestRef.current;
    if (!request) return;
    jumpToSearchResult(request.messageId);
  }, [jumpToSearchResult, messageJumpRequest?.key]);

  const handleSendMessage = () => {
    const content = messageInput.trim();
    if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (editingMessage) {
      wsRef.current.send(JSON.stringify({ type: 'edit', message_id: editingMessage.id, content }));
    } else {
      wsRef.current.send(JSON.stringify({ type: 'message', content, reply_to: replyTo?.id || null }));
    }

    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleFileUpload = async (file: File, caption = '') => {
    if (!file) return;

    const optimisticMessageId = createOptimisticUploadMessage(file, file.name, undefined, caption);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId.toString());
    if (caption.trim()) {
      formData.append('caption', caption.trim());
    }
    try {
      await uploadWithProgress({
        url: `${BASE_URL}/messages/upload`,
        formData,
        onProgress: (percent) => {
          updateOptimisticUploadProgress(optimisticMessageId, percent);
        },
      });
      settleOptimisticUpload(optimisticMessageId);
    } catch (error) {
      console.error('Group upload error:', error);
      markOptimisticUploadFailed(optimisticMessageId, String(translations.errorLoading || 'Upload failed'));
      setModal({ type: 'error', message: translations.errorLoading as string });
    }
  };

  return { createOptimisticUploadMessage, updateOptimisticUploadProgress, markOptimisticUploadFailed, settleOptimisticUpload, canDeleteMessage, getFormattedDateLabel, getMessageTime, loadOlderMessages, closeMenus, openMenus, handleMessageClick, scrollToMessage, jumpToSearchResult, handleSendMessage, handleFileUpload };
};
