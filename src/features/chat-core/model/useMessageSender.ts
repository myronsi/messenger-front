import type { Translations } from '@/shared/contexts/LanguageContext';
import type { MutableRefObject } from 'react';
import type { FileMessageContent, Message } from '@/entities/message';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { escapeCurlyBraces } from './messageText';
import { getLocalUploadFileType } from './uploadFileType';
import type { ChatTransport, OutgoingPayload, SetMessages, ShowError } from './types';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_CONNECT_WAIT_ATTEMPTS = 30;
const SOCKET_CONNECT_WAIT_MS = 100;

interface MessageSenderOptions {
  chatId: number;
  username: string;
  currentUserId: number;
  currentUserIdRef: MutableRefObject<number>;
  translations: Translations;
  translationsRef: MutableRefObject<Translations>;
  transport: ChatTransport;
  setMessages: SetMessages;
  setModal: ShowError;
  messageInput: string;
  setMessageInput: (value: string) => void;
  editingMessage: Message | null;
  setEditingMessage: (message: Message | null) => void;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
}

// Sending, optimistic rendering, delivery failures and uploads shared by one-to-one and group chats.
export const useMessageSender = ({
  chatId, username, currentUserId, currentUserIdRef, translations, translationsRef, transport, setMessages, setModal,
  messageInput, setMessageInput, editingMessage, setEditingMessage, replyTo, setReplyTo,
}: MessageSenderOptions) => {
  const { wsRef, messageQueueRef, pendingMessageIdsRef, requestReconnect } = transport;

  const getDeliveryErrorMessage = (message?: string) => {
    const lowerMessage = (message || '').toLowerCase();
    if (lowerMessage.includes('block')) {
      return translationsRef.current.messageNotDeliveredBlocked || "This message could not be delivered due to the recipient's privacy settings.";
    }
    if (lowerMessage.includes('privacy') || lowerMessage.includes('allow') || lowerMessage.includes('permission')) {
      return translationsRef.current.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.';
    }
    return message || translationsRef.current.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.';
  };

  const markMessageFailed = (messageId: number, message?: string) => {
    setMessages((previous) => previous.map((item) => item.id === messageId
      ? { ...item, delivery_error: getDeliveryErrorMessage(message) }
      : item));
    return true;
  };

  const markLatestPendingMessageFailed = (message?: string) => {
    const failedId = pendingMessageIdsRef.current.pop();
    if (!failedId) return false;
    markMessageFailed(failedId, message);
    return true;
  };

  const clearMessageDeliveryError = (messageId: number) => {
    setMessages((previous) => previous.map((item) => item.id === messageId
      ? { ...item, delivery_error: undefined }
      : item));
  };

  const createOptimisticUploadMessage = (
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
    setMessages((previous) => [...previous, optimisticMessage]);
    return tempId;
  };

  const updateOptimisticUploadProgress = (messageId: number, percent: number) => {
    setMessages((previous) => previous.map((message) => message.id === messageId
      ? { ...message, upload_progress: Math.max(1, Math.min(99, Math.round(percent))) }
      : message));
  };

  const markOptimisticUploadFailed = (messageId: number, errorMessage?: string) => {
    setMessages((previous) => previous.map((message) => message.id === messageId
      ? { ...message, upload_status: 'failed', delivery_error: errorMessage || translationsRef.current.errorLoading || 'Upload failed' }
      : message));
  };

  const settleOptimisticUpload = (messageId: number) => updateOptimisticUploadProgress(messageId, 99);

  // Sends now when the socket is open, otherwise queues the payload for the next successful connection.
  const sendOrQueue = (payload: OutgoingPayload) => {
    const enqueue = () => { messageQueueRef.current.push(payload); };
    const sendNow = () => {
      try {
        wsRef.current?.send(JSON.stringify(payload));
      } catch (error) {
        console.error('Error sending message via WebSocket:', error);
        enqueue();
      }
    };

    const state = wsRef.current?.readyState;
    if (state === WebSocket.OPEN) {
      sendNow();
    } else if (state === WebSocket.CONNECTING) {
      let waitAttempts = 0;
      const waitInterval = setInterval(() => {
        waitAttempts += 1;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(waitInterval);
          sendNow();
        } else if (waitAttempts >= SOCKET_CONNECT_WAIT_ATTEMPTS) {
          clearInterval(waitInterval);
          enqueue();
        }
      }, SOCKET_CONNECT_WAIT_MS);
    } else {
      enqueue();
      requestReconnect();
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    const contentToSend = messageInput.trim();
    const escapedMessage = escapeCurlyBraces(contentToSend);
    let payload: OutgoingPayload;

    if (editingMessage) {
      setMessages((previous) => previous.map((message) => message.id === editingMessage.id
        ? { ...message, content: contentToSend, edited_at: new Date().toISOString() }
        : message));
      payload = { type: 'edit', message_id: editingMessage.id, content: escapedMessage };
    } else {
      const tempId = -Date.now();
      const optimisticMessage: Message = {
        id: tempId,
        client_temp_id: tempId,
        sender_id: currentUserId || undefined,
        is_own: true,
        sender: username,
        sender_username: username,
        content: contentToSend,
        timestamp: new Date().toISOString(),
        avatar_url: DEFAULT_AVATAR,
        reply_to: replyTo?.id || null,
        is_deleted: false,
        type: 'message',
        reactions: [],
        read_by: [],
      };
      pendingMessageIdsRef.current.push(tempId);
      setMessages((previous) => [...previous, optimisticMessage]);
      payload = { type: 'message', content: escapedMessage, reply_to: replyTo?.id || null, client_temp_id: tempId };
    }

    sendOrQueue(payload);
    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleResendMessage = (message: Message) => {
    if (!message.delivery_error || (currentUserId && message.sender_id !== currentUserId)) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      markMessageFailed(message.id, translationsRef.current.webSocketError);
      requestReconnect();
      return;
    }
    clearMessageDeliveryError(message.id);
    wsRef.current.send(JSON.stringify({ type: 'resend', message_id: message.id }));
  };

  const handleFileUpload = async (file: File, caption = '') => {
    if (!file) return;
    const optimisticMessageId = createOptimisticUploadMessage(file, file.name, undefined, caption);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId.toString());
    if (caption.trim()) formData.append('caption', caption.trim());
    try {
      await uploadWithProgress({
        url: `${BASE_URL}/messages/upload`,
        formData,
        onProgress: (percent) => updateOptimisticUploadProgress(optimisticMessageId, percent),
      });
      settleOptimisticUpload(optimisticMessageId);
    } catch {
      markOptimisticUploadFailed(optimisticMessageId, translations.errorLoading || 'Upload failed');
      setModal({ type: 'error', message: translations.errorLoading });
    }
  };

  return {
    markMessageFailed,
    markLatestPendingMessageFailed,
    createOptimisticUploadMessage,
    updateOptimisticUploadProgress,
    markOptimisticUploadFailed,
    settleOptimisticUpload,
    handleSendMessage,
    handleResendMessage,
    handleFileUpload,
  };
};