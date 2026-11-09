import { getApiBaseUrl } from '@/shared/api/config';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { useEffect, useState } from 'react';
import { useDraftState } from '@/shared/hooks/useDraftState';
import { Message, ModalState } from '@/entities/message';
import { useCreateChatMutation } from '@/entities/chat';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import type { Drawing } from '@/shared/ui/drawing';
import { appendMessageFiles, createLocalFileContent } from '@/features/chat-core';

const BASE_URL = getApiBaseUrl();

interface PreviewChatOptions {
  chatId: EntityId;
  chatName: string;
  username: string;
  userId: EntityId | null;
  directDraftDisabled: boolean;
  directDraftReason: 'self' | 'blocked' | 'privacy' | null;
  translations: Translations;
  initialPendingApprovalRequest: boolean;
  initialPendingApprovalMessage: string;
  onChatCreated?: (newId: EntityId, newName: string) => void;
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
  // Keyed by the recipient, so an unsent first message survives a reload.
  const [previewMessageInput, setPreviewMessageInput] = useDraftState(chatName ? `preview:${chatName}` : null);
  const [previewFailedMessages, setPreviewFailedMessages] = useState<Message[]>([]);
  const [isCreatingPreviewChat, setIsCreatingPreviewChat] = useState(false);
  const [hasPendingApprovalRequest, setHasPendingApprovalRequest] = useState(false);
  const [previewModal, setPreviewModal] = useState<ModalState | null>(null);

  useEffect(() => {
    setHasPendingApprovalRequest(initialPendingApprovalRequest);
    setPreviewFailedMessages(
      initialPendingApprovalRequest && initialPendingApprovalMessage
        ? [createPendingApprovalPreviewMessage(initialPendingApprovalMessage)]
        : []
    );
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

  const createPreviewUploadMessage = (files: { file: Blob; fileName: string }[], caption: string) => {
    const tempId = -Date.now();
    const content = createLocalFileContent(files, caption);
    const optimisticMessage: Message = {
      id: tempId,
      client_temp_id: tempId,
      local_object_url: content.file_url,
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

  const updatePreviewUploadProgress = (messageId: EntityId, percent: number) => {
    setPreviewFailedMessages((current) => current.map((message) => (
      message.id === messageId
        ? { ...message, upload_progress: Math.max(1, Math.min(99, Math.round(percent))) }
        : message
    )));
  };

  const markPreviewUploadFailed = (messageId: EntityId, errorMessage?: string) => {
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

  const handleFileUploadPreview = async (selection: File | File[], caption = '', drawings: (Drawing | undefined)[] = []) => {
    const files = (Array.isArray(selection) ? selection : [selection]).map((file, index) => ({ file, fileName: file.name, drawing: drawings[index] }));
    if (files.length === 0 || isCreatingPreviewChat || hasPendingApprovalRequest) return;
    if (directDraftDisabled) {
      addFailedPreviewMessage(`${translations.fileMessagePreview || 'File'}: ${files.map(file => file.fileName).join(', ')}`);
      return;
    }
    setIsCreatingPreviewChat(true);
    let optimisticMessageId: EntityId | null = null;
    try {
      const response = await createChat({ user1: username, user2: chatName }).unwrap();
      if (response.approval_required || !response.chat_id) {
        throw new Error(translations.waitingForApproval || 'Waiting for user approval');
      }
      optimisticMessageId = createPreviewUploadMessage(files, caption);
      const formData = new FormData();
      appendMessageFiles(formData, files);
      formData.append('chat_id', response.chat_id.toString());
      formData.append('client_temp_id', String(optimisticMessageId));
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
        addFailedPreviewMessage(`${translations.fileMessagePreview || 'File'}: ${files.map(file => file.fileName).join(', ')}`);
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
