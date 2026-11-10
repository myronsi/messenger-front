import { getApiBaseUrl } from '@/shared/api/config';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/shared/api/client';
import { contractData } from '@/shared/api/tasks';
import { createTempMessageId } from '@/shared/api/tempMessageId';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { useDraftState } from '@/shared/hooks/useDraftState';
import { useAppDispatch } from '@/shared/hooks/redux';
import { Message, ModalState } from '@/entities/message';
import { chatApi, useCreateChatMutation } from '@/entities/chat';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import type { Drawing } from '@/shared/ui/drawing';
import { appendMessageFiles, createLocalFileContent } from '@/features/chat-core';
import { createPreviewSendQueue } from './previewSendQueue';

const BASE_URL = getApiBaseUrl();

interface PreviewChatOptions {
  chatId: EntityId;
  chatName: string;
  chatDisplayName?: string;
  avatarUrl?: string;
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
  chatDisplayName,
  avatarUrl,
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
  const dispatch = useAppDispatch();
  const [createChat] = useCreateChatMutation();
  // Keyed by the recipient, so an unsent first message survives a reload.
  const [previewMessageInput, setPreviewMessageInput] = useDraftState(chatName ? `preview:${chatName}` : null);
  const [previewFailedMessages, setPreviewFailedMessages] = useState<Message[]>([]);
  const [isCreatingPreviewChat, setIsCreatingPreviewChat] = useState(false);
  const [hasPendingApprovalRequest, setHasPendingApprovalRequest] = useState(false);
  const [previewModal, setPreviewModal] = useState<ModalState | null>(null);
  const latest = useLatestRef({ username, chatName, onChatCreated });
  const notifiedRef = useRef(false);
  const queueRef = useRef<ReturnType<typeof createPreviewSendQueue> | null>(null);
  const sendQueue = () => {
    queueRef.current ??= createPreviewSendQueue({
      create: (initialMessage) => createChat({ user1: latest.current.username, user2: latest.current.chatName, initial_message: initialMessage }).unwrap(),
      onBusyChange: setIsCreatingPreviewChat,
      onDrained: (response) => {
        if (!response?.chat_id || response.approval_required || notifiedRef.current) return;
        notifiedRef.current = true;
        latest.current.onChatCreated?.(response.chat_id, latest.current.chatName);
      },
    });
    return queueRef.current;
  };

  useEffect(() => {
    if (isPersistedId(chatId)) return;
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
      id: createTempMessageId(),
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
    id: createTempMessageId(),
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

  const clearPreviewMessages = useCallback(() => {
    setPreviewFailedMessages((current) => (current.length ? [] : current));
  }, []);

  const createSendingPreviewMessage = (content: string): Message => {
    const tempId = createTempMessageId();
    return {
      id: tempId,
      client_temp_id: tempId,
      sender_id: userId || undefined,
      is_own: true,
      sender: username,
      sender_username: username,
      content,
      timestamp: new Date().toISOString(),
      type: 'message',
      reactions: [],
      read_by: [],
    };
  };

  const replacePreviewMessage = (messageId: EntityId, next: Message | null) => {
    setPreviewFailedMessages((current) => current.flatMap((message) => (
      message.id === messageId ? (next ? [next] : []) : [message]
    )));
  };

  const addOptimisticChatListEntry = (message: Message) => dispatch(chatApi.util.updateQueryData('getOneOnOneChats', username, (draft) => {
    if (draft.chats.some((chat) => chat.interlocutor_name.toLowerCase() === chatName.toLowerCase())) return;
    draft.chats.unshift({
      id: chatId,
      interlocutor_name: chatName,
      interlocutor_display_name: chatDisplayName || chatName,
      avatar_url: avatarUrl,
      interlocutor_deleted: false,
      unread_count: 0,
      last_message: {
        id: message.id,
        sender_id: userId || 0,
        sender_name: username,
        content: message.content,
        type: 'message',
        timestamp: message.timestamp,
      },
    });
  }));

  const createPreviewUploadMessage = (files: { file: Blob; fileName: string }[], caption: string) => {
    const tempId = createTempMessageId();
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
    if (!content || hasPendingApprovalRequest) return;
    if (directDraftDisabled) {
      addFailedPreviewMessage(content);
      setPreviewMessageInput('');
      return;
    }
    const sending = createSendingPreviewMessage(content);
    setPreviewFailedMessages((current) => [...current, sending]);
    setPreviewMessageInput('');
    const listEntry = addOptimisticChatListEntry(sending);
    await sendQueue().enqueue(async (ensureChat) => {
      const { created, carriedMessage } = ensureChat(content);
      try {
        const response = await created;
        if (response.approval_required) {
          listEntry.undo();
          setHasPendingApprovalRequest(true);
          if (!carriedMessage) {
            replacePreviewMessage(sending.id, { ...sending, delivery_error: translations.waitingForApproval || 'Waiting for user approval' });
          } else if (response.already_pending) {
            replacePreviewMessage(sending.id, null);
            setPreviewModal({
              type: 'error',
              message: translations.alreadyWaitingForApproval || 'You already sent a request. Wait for approval before sending more messages.',
            });
          } else {
            replacePreviewMessage(sending.id, createPendingApprovalPreviewMessage(content));
          }
          return;
        }
        if (!response.chat_id) throw new Error('Chat was not created');
        if (!carriedMessage) {
          contractData(await apiClient.POST('/chats/{chat_id}/messages', {
            params: { path: { chat_id: String(response.chat_id) } },
            body: { client_temp_id: String(sending.client_temp_id), type: 'text', content },
          }));
        }
      } catch (error) {
        console.error('Failed to create chat/send message:', error);
        listEntry.undo();
        replacePreviewMessage(sending.id, { ...sending, delivery_error: getDeliveryBlockedMessage() });
      }
    });
  };

  const handleFileUploadPreview = async (selection: File | File[], caption = '', drawings: (Drawing | undefined)[] = []) => {
    const files = (Array.isArray(selection) ? selection : [selection]).map((file, index) => ({ file, fileName: file.name, drawing: drawings[index] }));
    if (files.length === 0 || hasPendingApprovalRequest) return;
    if (directDraftDisabled) {
      addFailedPreviewMessage(`${translations.fileMessagePreview || 'File'}: ${files.map(file => file.fileName).join(', ')}`);
      return;
    }
    const optimisticMessageId = createPreviewUploadMessage(files, caption);
    await sendQueue().enqueue(async (ensureChat) => {
      try {
        const response = await ensureChat().created;
        if (response.approval_required || !response.chat_id) {
          throw new Error(translations.waitingForApproval || 'Waiting for user approval');
        }
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
      } catch (error) {
        console.error('Failed to create chat/upload file:', error);
        markPreviewUploadFailed(optimisticMessageId, translations.errorLoading || 'Upload failed');
      }
    });
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
    clearPreviewMessages,
    handleSendMessagePreview,
    handleFileUploadPreview,
  };
};
