import { useEffect, useState } from 'react';
import { FileMessageContent, Message } from '@/entities/message';
import { useCreateChatMutation } from '@/entities/chat';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { getLocalUploadFileType } from '@/features/chat-core';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface PreviewChatOptions {
  chatId: number;
  chatName: string;
  username: string;
  userId: number | null;
  directDraftDisabled: boolean;
  directDraftReason: 'self' | 'blocked' | 'privacy' | null;
  translations: Record<string, any>;
  initialPendingApprovalRequest: boolean;
  initialPendingApprovalMessage: string;
  onChatCreated?: (newId: number, newName: string) => void;
}

export const usePreviewChat = ({
  chatName,
  chatId,
  username,
  userId,
  directDraftDisabled,
  directDraftReason,
  translations,
  initialPendingApprovalRequest,
  initialPendingApprovalMessage,
  onChatCreated,
}: PreviewChatOptions) => {
  const [createChat] = useCreateChatMutation();
  const [previewMessageInput, setPreviewMessageInput] = useState('');
  const [previewFailedMessages, setPreviewFailedMessages] = useState<Message[]>([]);
  const [isCreatingPreviewChat, setIsCreatingPreviewChat] = useState(false);
  const [hasPendingApprovalRequest, setHasPendingApprovalRequest] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  useEffect(() => {
    setHasPendingApprovalRequest(initialPendingApprovalRequest);
    setPreviewFailedMessages(
      initialPendingApprovalRequest && initialPendingApprovalMessage
        ? [createPendingApprovalPreviewMessage(initialPendingApprovalMessage)]
        : []
    );
    setPreviewMessageInput('');
  }, [chatId, chatName, initialPendingApprovalRequest, initialPendingApprovalMessage]);

  const getDeliveryBlockedMessage = () => (
    directDraftReason === 'blocked'
      ? translations.messageNotDeliveredBlocked || "This message could not be delivered due to the recipient's privacy settings."
      : directDraftReason === 'self'
        ? translations.messageNotDeliveredSelf || 'This message cannot be sent to yourself.'
        : translations.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.'
  );

  const addFailedPreviewMessage = (content: string) => {
    setPreviewFailedMessages((current) => [...current, {
      id: -Date.now(),
      sender_id: userId || undefined,
      is_own: true,
      sender: username,
      sender_username: username,
      content,
      timestamp: new Date().toISOString(),
      type: 'message',
      delivery_error: getDeliveryBlockedMessage(),
      read_by: [],
    }]);
  };

  const createPendingApprovalPreviewMessage = (content: string): Message => ({
    id: -Date.now(),
    sender_id: userId || undefined,
    is_own: true,
    sender: username,
    sender_username: username,
    content,
    timestamp: new Date().toISOString(),
    type: 'message',
    delivery_error: translations.waitingForApproval || 'Waiting for user approval',
    read_by: [],
  });

  const addPendingApprovalPreviewMessage = (content: string) => {
    setPreviewFailedMessages((current) => [...current, createPendingApprovalPreviewMessage(content)]);
  };

  const createPreviewUploadMessage = (file: File, caption = '') => {
    const tempId = -Date.now();
    const objectUrl = URL.createObjectURL(file);
    const content: FileMessageContent = {
      file_url: objectUrl,
      file_name: file.name,
      file_type: getLocalUploadFileType(file.name, file.type),
      file_size: file.size,
      ...(caption.trim() ? { caption: caption.trim() } : {}),
    };
    const optimisticMessage: Message = {
      id: tempId,
      client_temp_id: tempId,
      local_object_url: objectUrl,
      upload_status: 'uploading',
      upload_progress: 1,
      sender_id: userId || undefined,
      is_own: true,
      sender: username,
      sender_username: username,
      content,
      timestamp: new Date().toISOString(),
      type: 'file',
      reactions: [],
      read_by: [],
    };
    setPreviewFailedMessages((current) => [...current, optimisticMessage]);
    return tempId;
  };

  const updatePreviewUploadProgress = (messageId: number, percent: number) => {
    setPreviewFailedMessages((current) => current.map((message) => (
      message.id === messageId
        ? { ...message, upload_progress: Math.max(1, Math.min(99, Math.round(percent))) }
        : message
    )));
  };

  const markPreviewUploadFailed = (messageId: number, errorMessage?: string) => {
    setPreviewFailedMessages((current) => current.map((message) => (
      message.id === messageId
        ? { ...message, upload_status: 'failed', delivery_error: errorMessage || translations.errorLoading || 'Upload failed' }
        : message
    )));
  };

  const handleSendMessagePreview = async () => {
    const content = previewMessageInput.trim();
    if (!content || isCreatingPreviewChat || hasPendingApprovalRequest) return;
    if (directDraftDisabled) {
      addFailedPreviewMessage(content);
      setPreviewMessageInput('');
      return;
    }
    setIsCreatingPreviewChat(true);
    try {
      const response = await createChat({ user1: username, user2: chatName, initial_message: content }).unwrap();
      if (response.approval_required) {
        setHasPendingApprovalRequest(true);
        if (response.already_pending) {
          setPreviewModal({
            type: 'error',
            message: translations.alreadyWaitingForApproval || 'You already sent a request. Wait for approval before sending more messages.',
          });
        } else {
          addPendingApprovalPreviewMessage(content);
        }
        setPreviewMessageInput('');
        return;
      }
      if (!response.chat_id) throw new Error('Chat was not created');
      setPreviewMessageInput('');
      onChatCreated?.(response.chat_id, chatName);
    } catch (error) {
      console.error('Failed to create chat/send message:', error);
      addFailedPreviewMessage(content);
    } finally {
      setIsCreatingPreviewChat(false);
    }
  };

  const handleFileUploadPreview = async (file: File, caption = '') => {
    if (!file || isCreatingPreviewChat || hasPendingApprovalRequest) return;
    if (directDraftDisabled) {
      addFailedPreviewMessage(`${translations.fileMessagePreview || 'File'}: ${file.name}`);
      return;
    }
    setIsCreatingPreviewChat(true);
    let optimisticMessageId: number | null = null;
    try {
      const response = await createChat({ user1: username, user2: chatName }).unwrap();
      if (response.approval_required || !response.chat_id) {
        throw new Error(translations.waitingForApproval || 'Waiting for user approval');
      }
      optimisticMessageId = createPreviewUploadMessage(file, caption);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chat_id', response.chat_id.toString());
      if (caption.trim()) formData.append('caption', caption.trim());
      await uploadWithProgress({
        url: `${BASE_URL}/messages/upload`,
        formData,
        onProgress: updatePreviewUploadProgress.bind(null, optimisticMessageId),
      });
      updatePreviewUploadProgress(optimisticMessageId, 99);
      onChatCreated?.(response.chat_id, chatName);
    } catch (error) {
      console.error('Failed to create chat/upload file:', error);
      if (optimisticMessageId !== null) {
        markPreviewUploadFailed(optimisticMessageId, translations.errorLoading || 'Upload failed');
      } else {
        addFailedPreviewMessage(`${translations.fileMessagePreview || 'File'}: ${file.name}`);
      }
    } finally {
      setIsCreatingPreviewChat(false);
    }
  };

  return {
    previewMessageInput,
    setPreviewMessageInput,
    previewFailedMessages,
    isCreatingPreviewChat,
    hasPendingApprovalRequest,
    setHasPendingApprovalRequest,
    previewModal,
    setPreviewModal,
    handleSendMessagePreview,
    handleFileUploadPreview,
  };
};
