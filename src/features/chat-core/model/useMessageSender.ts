import { createTempMessageId } from '@/shared/api/tempMessageId';
import { getApiBaseUrl } from '@/shared/api/config';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { useRef, type MutableRefObject } from 'react';
import type { Message } from '@/entities/message';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { isGoApi } from '@/shared/api/goSocket';
import { escapeCurlyBraces } from './messageText';
import { applyMessageEdit, editableText, mergeIncomingMessage } from './messageUpdates';
import { createdMessage, unconfirmedSends, useUnsentMessageRelease } from './unsentMessages';
import { appendMessageFiles, createLocalFileContent } from './uploadFileType';
import { createOptimisticMessage } from './optimisticMessage';
import type { ChatTransport, OutgoingPayload, SetMessages, ShowError } from './types';

const BASE_URL = getApiBaseUrl();
const SOCKET_CONNECT_WAIT_ATTEMPTS = 30;
const SOCKET_CONNECT_WAIT_MS = 100;

interface MessageSenderOptions {
  chatId: EntityId;
  username: string;
  currentUserId: EntityId;
  currentUserIdRef: MutableRefObject<EntityId>;
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

  const markMessageFailed = (messageId: EntityId, message?: string) => {
    setMessages((previous) => previous.map((item) => String(item.id) === String(messageId)
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

  const clearMessageDeliveryError = (messageId: EntityId) => {
    setMessages((previous) => previous.map((item) => item.id === messageId
      ? { ...item, delivery_error: undefined }
      : item));
  };

  const replyToRef = useRef(replyTo);
  replyToRef.current = replyTo;
  const { uploadSourcesRef, uploadingRef, releasedRef, releaseSource } = useUnsentMessageRelease(chatId, setMessages, translationsRef);
  const sentRef = useRef(new Map<string, OutgoingPayload>());

  const createOptimisticFileMessage = (files: { file: Blob; fileName: string }[], caption: string, fileType?: string) => {
    const tempId = createTempMessageId();
    const reply = replyToRef.current;
    if (reply) setReplyTo(null);
    const content = createLocalFileContent(files, caption, fileType);
    const objectUrls = (content.album ?? [content]).map(item => item.file_url);
    const optimisticMessage = createOptimisticMessage(tempId, username, currentUserIdRef.current || currentUserId || undefined, {
      type: 'file', content, reply_to: reply?.id || null, local_object_url: objectUrls[0], upload_status: 'uploading', upload_progress: 1,
    });
    setMessages((previous) => [...previous, optimisticMessage]);
    uploadSourcesRef.current.set(String(tempId), { files, objectUrls });
    uploadingRef.current.add(String(tempId));
    return tempId;
  };

  const createOptimisticUploadMessage = (file: Blob, fileName: string, fileType?: string) =>
    createOptimisticFileMessage([{ file, fileName }], '', fileType);

  const updateOptimisticUploadProgress = (messageId: EntityId, percent: number) => {
    setMessages((previous) => previous.map((message) => message.id === messageId
      ? { ...message, upload_progress: Math.max(1, Math.min(99, Math.round(percent))) }
      : message));
  };

  const markOptimisticUploadFailed = (messageId: EntityId, errorMessage?: string) => {
    const id = String(messageId);
    uploadingRef.current.delete(id);
    const lost = releasedRef.current;
    if (lost) releaseSource(id);
    const deliveryError = lost
      ? translationsRef.current.uploadNotSent
      : errorMessage || translationsRef.current.errorLoading || 'Upload failed';
    setMessages((previous) => previous.map((message) => message.id === messageId
      ? { ...message, upload_status: lost ? 'lost' : 'failed', delivery_error: deliveryError }
      : message));
  };

  const settleOptimisticUpload = (messageId: EntityId, created?: unknown) => {
    uploadingRef.current.delete(String(messageId));
    // The socket echo may have replaced the draft before this HTTP response.
    setTimeout(() => releaseSource(String(messageId)), 1000);
    updateOptimisticUploadProgress(messageId, 99);
    const saved = createdMessage(created);
    if (saved) setMessages((previous) => mergeIncomingMessage(previous, saved));
  };

  const uploadOptimisticMessage = async (messageId: EntityId, files: { file: Blob; fileName: string }[], voice: boolean, replyToId?: EntityId | null, caption = '') => {
    const formData = new FormData();
    appendMessageFiles(formData, files);
    formData.append('chat_id', chatId.toString());
    formData.append('client_temp_id', String(messageId));
    if (replyToId != null) formData.append('reply_to', String(replyToId));
    if (caption.trim()) formData.append('caption', caption.trim());
    try {
      const created = await uploadWithProgress({
        url: `${BASE_URL}/messages/${voice ? 'vm' : 'upload'}`,
        formData,
        onProgress: (percent) => updateOptimisticUploadProgress(messageId, percent),
      });
      settleOptimisticUpload(messageId, created);
    } catch {
      markOptimisticUploadFailed(messageId, translations.errorLoading || 'Upload failed');
      setModal({ type: 'error', message: translations.errorLoading });
    }
  };

  // Sends now when the socket is open, otherwise queues the payload for the next successful connection.
  const sendOrQueue = (payload: OutgoingPayload) => {
    const enqueue = () => { messageQueueRef.current.push(payload); };
    const sendNow = () => {
      try {
        wsRef.current?.send(JSON.stringify(payload));
        if (payload.type === 'message' && payload.client_temp_id != null) sentRef.current.set(String(payload.client_temp_id), payload);
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
    const contentToSend = messageInput.trim();
    if (editingMessage && editableText(editingMessage).trim() === contentToSend) {
      setMessageInput('');
      setEditingMessage(null);
      return;
    }
    if (!contentToSend && editingMessage?.type !== 'file') return;
    const escapedMessage = isGoApi() ? contentToSend : escapeCurlyBraces(contentToSend);
    let payload: OutgoingPayload;

    if (editingMessage) {
      if (!isGoApi()) setMessages((previous) => applyMessageEdit(previous, editingMessage.id, contentToSend));
      payload = { type: 'edit', message_id: editingMessage.id, content: escapedMessage };
    } else {
      const tempId = createTempMessageId();
      const optimisticMessage = createOptimisticMessage(tempId, username, currentUserId || undefined, {
        type: 'message', content: contentToSend, reply_to: replyTo?.id || null,
      });
      pendingMessageIdsRef.current.push(tempId);
      setMessages((previous) => [...previous, optimisticMessage]);
      payload = { type: 'message', content: escapedMessage, reply_to: replyTo?.id || null, client_temp_id: tempId };
    }

    sendOrQueue(payload);
    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  const retryUnsavedMessage = (message: Message, changes: Partial<Message>) => {
    setMessages((previous) => {
      const failed = previous.find((item) => String(item.id) === String(message.id));
      if (!failed) return previous;
      return [
        ...previous.filter((item) => item !== failed),
        { ...failed, ...changes, delivery_error: undefined, timestamp: new Date().toISOString() },
      ];
    });
    return message.client_temp_id ?? message.id;
  };

  const resendUnsavedMessage = (message: Message) => {
    if (message.type === 'file') {
      const source = uploadSourcesRef.current.get(String(message.id));
      if (!source) {
        setMessages((previous) => previous.filter((item) => String(item.id) !== String(message.id)));
        return;
      }
      if (typeof message.content === 'string') return;
      const content = message.content;
      const tempId = retryUnsavedMessage(message, { upload_status: 'uploading', upload_progress: 1 });
      uploadingRef.current.add(String(message.id));
      void uploadOptimisticMessage(tempId, source.files, content.file_type === 'voice', message.reply_to, content.caption ?? '');
      return;
    }
    if (typeof message.content !== 'string') return;
    const tempId = retryUnsavedMessage(message, {});
    pendingMessageIdsRef.current = pendingMessageIdsRef.current.filter((id) => String(id) !== String(message.id));
    pendingMessageIdsRef.current.push(message.id);
    const content = isGoApi() ? message.content : escapeCurlyBraces(message.content);
    sendOrQueue({ type: 'message', content, reply_to: message.reply_to ?? null, client_temp_id: tempId });
  };

  const handleResendMessage = (message: Message) => {
    if (!message.delivery_error || (currentUserId && message.sender_id !== currentUserId)) return;
    if (!isPersistedId(message.id)) {
      resendUnsavedMessage(message);
      return;
    }
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      markMessageFailed(message.id, translationsRef.current.webSocketError);
      requestReconnect();
      return;
    }
    clearMessageDeliveryError(message.id);
    wsRef.current.send(JSON.stringify({ type: 'resend', message_id: message.id }));
  };

  const handleFileUpload = async (selection: File | File[], caption = '') => {
    const files = (Array.isArray(selection) ? selection : [selection]).map(file => ({ file, fileName: file.name }));
    if (files.length === 0) return;
    const replyToId = replyToRef.current?.id;
    const optimisticMessageId = createOptimisticFileMessage(files, caption);
    await uploadOptimisticMessage(optimisticMessageId, files, false, replyToId, caption);
  };

  const resendUnconfirmed = () => {
    unconfirmedSends(sentRef.current, pendingMessageIdsRef.current, messageQueueRef.current).forEach(sendOrQueue);
  };

  return {
    resendUnconfirmed,
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
