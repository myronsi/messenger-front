import type { Translations } from '@/shared/contexts/LanguageContext';
import type { MutableRefObject } from 'react';
import type { FileMessageContent, Message } from '@/entities/message';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { uploadAttachmentWithProgress } from '@/shared/api/attachments';
import { RealtimeError } from '@/shared/api/realtime';
import { apiErrorCode } from '@/shared/lib/apiError';
import { getLocalUploadFileType } from './uploadFileType';
import { confirmSentMessage } from './messageUpdates';
import type { ChatTransport, SetMessages, ShowError } from './types';
import type { Id } from '@/shared/lib/ids';
import { isLocalId, newLocalId } from '@/shared/lib/ids';

interface MessageSenderOptions {
  chatId: Id;
  username: string;
  currentUserId: Id;
  currentUserIdRef: MutableRefObject<Id>;
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

// What the socket answers when a message cannot be delivered (the contract's error codes).
const isBlocked = (code: string) => code === 'blocked_by_user';
const isPrivacy = (code: string) => code === 'forbidden' || code === 'approval_required';

// Sending, optimistic rendering, delivery failures and uploads shared by one-to-one and group chats. A
// message is shown at once with a local id, which is also its client_temp_id: the ack (or the message
// itself arriving) swaps it for the stored id; an error marks it failed, and resending repeats the same
// client_temp_id, so the server never stores it twice.
export const useMessageSender = ({
  username, currentUserId, currentUserIdRef, translations, translationsRef, transport, setMessages, setModal,
  messageInput, setMessageInput, editingMessage, setEditingMessage, replyTo, setReplyTo,
}: MessageSenderOptions) => {
  const { realtime, pendingMessageIdsRef } = transport;

  const getDeliveryErrorMessage = (message?: string) => {
    const t = translationsRef.current;
    const code = message ?? '';
    if (isBlocked(code) || code.toLowerCase().includes('block')) {
      return t.messageNotDeliveredBlocked || "This message could not be delivered due to the recipient's privacy settings.";
    }
    if (isPrivacy(code)) {
      return t.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.';
    }
    return message || t.webSocketError || 'This message could not be sent.';
  };

  const markMessageFailed = (messageId: Id, message?: string) => {
    setMessages((previous) => previous.map((item) => item.id === messageId
      ? { ...item, delivery_error: getDeliveryErrorMessage(message) }
      : item));
    return true;
  };

  const clearMessageDeliveryError = (messageId: Id) => {
    setMessages((previous) => previous.map((item) => item.id === messageId
      ? { ...item, delivery_error: undefined }
      : item));
  };

  // Sends a message event under its local id and settles the optimistic copy with the answer.
  const sendMessageEvent = (localId: Id, data: Parameters<typeof realtime.request>[0] & { type: 'message' }) => {
    if (!pendingMessageIdsRef.current.includes(localId)) pendingMessageIdsRef.current.push(localId);
    realtime.request(data, localId)
      .then((ack) => {
        pendingMessageIdsRef.current = pendingMessageIdsRef.current.filter((id) => id !== localId);
        if (typeof ack.message_id === 'string' && typeof ack.created_at === 'string') {
          const { message_id: messageId, created_at: createdAt } = ack;
          setMessages((previous) => confirmSentMessage(previous, localId, messageId, createdAt));
        }
      })
      .catch((error: unknown) => {
        pendingMessageIdsRef.current = pendingMessageIdsRef.current.filter((id) => id !== localId);
        markMessageFailed(localId, error instanceof RealtimeError ? error.message : undefined);
      });
  };

  const createOptimisticUploadMessage = (
    file: Blob,
    fileName: string,
    fileType = getLocalUploadFileType(fileName, file.type),
    caption = ''
  ) => {
    const tempId = newLocalId();
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

  const updateOptimisticUploadProgress = (messageId: Id, percent: number) => {
    setMessages((previous) => previous.map((message) => message.id === messageId
      ? { ...message, upload_progress: Math.max(1, Math.min(99, Math.round(percent))) }
      : message));
  };

  const markOptimisticUploadFailed = (messageId: Id, errorMessage?: string) => {
    setMessages((previous) => previous.map((message) => message.id === messageId
      ? { ...message, upload_status: 'failed', delivery_error: errorMessage || translationsRef.current.errorLoading || 'Upload failed' }
      : message));
  };

  const settleOptimisticUpload = (messageId: Id) => updateOptimisticUploadProgress(messageId, 99);

  // Uploads a file as a message attachment and sends the message that references it. Voice messages are
  // uploaded with kind "voice", so the server measures them.
  const sendAttachment = async (localId: Id, file: Blob, fileName: string, options: { voice?: boolean; caption?: string } = {}) => {
    try {
      const attachment = await uploadAttachmentWithProgress(file, {
        purpose: 'message',
        kind: options.voice ? 'voice' : undefined,
        fileName,
        onProgress: (percent) => updateOptimisticUploadProgress(localId, percent),
      });
      settleOptimisticUpload(localId);
      sendMessageEvent(localId, {
        type: 'message',
        data: {
          type: options.voice ? 'voice' : 'file',
          attachment_id: attachment.id,
          content: options.caption?.trim() || null,
        },
      });
      return true;
    } catch (error) {
      console.error('Upload failed:', apiErrorCode(error) ?? error);
      markOptimisticUploadFailed(localId, translationsRef.current.errorLoading || 'Upload failed');
      return false;
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    const contentToSend = messageInput.trim();

    if (editingMessage) {
      const editedId = editingMessage.id;
      const previousContent = editingMessage.content;
      setMessages((previous) => previous.map((message) => message.id === editedId
        ? { ...message, content: contentToSend, edited_at: new Date().toISOString() }
        : message));
      realtime.request({ type: 'edit', data: { message_id: editedId, content: contentToSend } }).catch(() => {
        setMessages((previous) => previous.map((message) => message.id === editedId ? { ...message, content: previousContent } : message));
        setModal({ type: 'error', message: translationsRef.current.webSocketError });
      });
    } else {
      const tempId = newLocalId();
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
      setMessages((previous) => [...previous, optimisticMessage]);
      sendMessageEvent(tempId, {
        type: 'message',
        data: { type: 'text', content: contentToSend, reply_to: replyTo?.id || null },
      });
    }

    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  // A failed message is sent again with the same client_temp_id (the server stores it once); one the server
  // saved but did not deliver is asked for again with `resend`.
  const handleResendMessage = (message: Message) => {
    if (!message.delivery_error || (currentUserId && message.sender_id !== currentUserId)) return;
    clearMessageDeliveryError(message.id);
    if (!isLocalId(message.id)) {
      realtime.request({ type: 'resend', data: { message_id: message.id } })
        .catch((error: unknown) => markMessageFailed(message.id, error instanceof RealtimeError ? error.message : undefined));
      return;
    }
    if (message.type === 'file') {
      // An upload that failed has nothing to resend; the file must be chosen again.
      markMessageFailed(message.id, translationsRef.current.errorLoading);
      return;
    }
    const content = typeof message.content === 'string' ? message.content : '';
    sendMessageEvent(message.id, { type: 'message', data: { type: 'text', content, reply_to: message.reply_to ?? null } });
  };

  const handleVoiceMessage = (file: Blob, fileName: string) => {
    const localId = createOptimisticUploadMessage(file, fileName, 'voice');
    void sendAttachment(localId, file, fileName, { voice: true });
  };

  const handleFileUpload = async (file: File, caption = '') => {
    if (!file) return;
    const localId = createOptimisticUploadMessage(file, file.name, undefined, caption);
    const sent = await sendAttachment(localId, file, file.name, { caption });
    if (!sent) setModal({ type: 'error', message: translations.errorLoading });
  };

  return {
    markMessageFailed,
    createOptimisticUploadMessage,
    updateOptimisticUploadProgress,
    markOptimisticUploadFailed,
    settleOptimisticUpload,
    sendAttachment,
    handleSendMessage,
    handleResendMessage,
    handleFileUpload,
    handleVoiceMessage,
  };
};
