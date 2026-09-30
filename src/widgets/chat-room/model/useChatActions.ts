import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { FileMessageContent, Message } from '@/entities/message';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { authFetch } from '@/shared/auth/session';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getLocalUploadFileType = (fileName: string, mimeType = '') => {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'].includes(extension)) return 'image';
  if (mimeType.startsWith('video/') || ['.mp4', '.mov', '.ogg'].includes(extension)) return 'video';
  if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(extension)) return 'audio';
  if (['.pdf', '.doc', '.docx', '.txt'].includes(extension)) return 'document';
  if (extension === '.pptx') return 'presention';
  if (extension === '.zip') return 'arcive';
  if (['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css'].includes(extension)) return 'code';
  return 'none';
};

interface ChatActionsOptions {
  chatId: number;
  username: string;
  currentUserId: number;
  currentUserIdRef: MutableRefObject<number>;
  translations: Record<string, any>;
  translationsRef: MutableRefObject<Record<string, any>>;
  onBack: () => void;
  setModal: (modal: any) => void;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  messageInput: string;
  setMessageInput: (value: string) => void;
  editingMessage: Message | null;
  setEditingMessage: (message: Message | null) => void;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  wsRef: MutableRefObject<WebSocket | null>;
  messageQueueRef: MutableRefObject<any[]>;
  pendingMessageIdsRef: MutableRefObject<number[]>;
  setConnectionRetryKey: Dispatch<SetStateAction<number>>;
}

export const createChatActions = ({
  chatId, username, currentUserId, currentUserIdRef, translations, translationsRef,
  onBack, setModal, setMessages, messageInput, setMessageInput,
  editingMessage, setEditingMessage, replyTo, setReplyTo, wsRef, messageQueueRef,
  pendingMessageIdsRef, setConnectionRetryKey,
}: ChatActionsOptions) => {
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

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    const contentToSend = messageInput.trim();
    const escapedMessage = contentToSend.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    const isEditing = !!editingMessage;
    let tempId: number | null = null;
    if (editingMessage) {
      setMessages((previous) => previous.map((message) => message.id === editingMessage.id
        ? { ...message, content: contentToSend, edited_at: new Date().toISOString() }
        : message));
    } else {
      tempId = -Date.now();
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
    }

    const messageToSend = isEditing
      ? { type: 'edit', message_id: editingMessage!.id, content: escapedMessage }
      : { type: 'message', content: escapedMessage, reply_to: replyTo?.id || null, client_temp_id: tempId };
    const sendMsg = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(messageToSend));
        } catch (error) {
          console.error('Error sending message via WebSocket:', error);
          messageQueueRef.current.push(messageToSend);
        }
      } else {
        messageQueueRef.current.push(messageToSend);
      }
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMsg();
    } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      let waitAttempts = 0;
      const waitInterval = setInterval(() => {
        waitAttempts++;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(waitInterval);
          sendMsg();
        } else if (waitAttempts >= 30) {
          clearInterval(waitInterval);
          messageQueueRef.current.push(messageToSend);
        }
      }, 100);
    } else {
      messageQueueRef.current.push(messageToSend);
      setConnectionRetryKey((key) => key + 1);
    }
    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleResendMessage = (message: Message) => {
    if (!message.delivery_error || (currentUserId && message.sender_id !== currentUserId)) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      markMessageFailed(message.id, translationsRef.current.webSocketError);
      setConnectionRetryKey((key) => key + 1);
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

  const handleDeleteChat = () => {
    setModal({
      type: 'deleteChat',
      message: translations.deleteChatConfirmMessage || translations.deleteChatConfirm,
      consequences: translations.deleteChatConsequences || [
        'This chat will be removed from your chat list.',
        'You will lose access to this conversation history in the app.',
        'This does not block the user or change your privacy settings.',
      ],
      onConfirm: async () => {
        try {
          const response = await authFetch(`${BASE_URL}/chats/delete/${chatId}`, { method: 'DELETE' });
          if (response.ok) onBack();
          else throw new Error(translations.errorDeleting);
        } catch {
          setModal({ type: 'error', message: translations.errorDeletingChat });
        }
      },
    });
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
    handleDeleteChat,
  };
};
