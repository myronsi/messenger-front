import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { FileMessageContent, Message } from '@/entities/message';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { uploadAttachmentWithProgress } from '@/shared/api/attachments';
import { isAbortError } from '@/shared/api/uploadWithProgress';
import { apiErrorMessage } from '@/shared/lib/apiError';
import type { Id } from '@/shared/lib/ids';
import { newLocalId } from '@/shared/lib/ids';
import { getLocalUploadFileType } from './uploadFileType';
import type { SetMessages } from './types';

type MessageEvent = { type: 'message'; data: { type: 'file' | 'voice'; attachment_id: string; content: string | null } };

interface AttachmentUploadsOptions {
  username: string;
  currentUserId: Id;
  currentUserIdRef: MutableRefObject<Id>;
  translationsRef: MutableRefObject<Translations>;
  setMessages: SetMessages;
  // Sends the message that refers to the uploaded attachment, under the optimistic message's local id;
  // onDelivered runs once the server stored it.
  sendMessageEvent: (localId: Id, event: MessageEvent, onDelivered?: () => void) => void;
}

// An upload in flight or one that can be tried again: the file stays here until its message is sent.
interface Upload {
  file: Blob;
  fileName: string;
  voice: boolean;
  caption: string;
  controller?: AbortController;
  attachmentId?: string;
}

// File and voice messages: each is shown at once with its upload progress, can be cancelled while it
// uploads, and can be tried again when the upload or the message fails (the stored attachment is reused).
export const useAttachmentUploads = ({
  username, currentUserId, currentUserIdRef, translationsRef, setMessages, sendMessageEvent,
}: AttachmentUploadsOptions) => {
  const uploadsRef = useRef(new Map<Id, Upload>());

  // Leaving the chat cancels what is still uploading.
  useEffect(() => () => uploadsRef.current.forEach((upload) => upload.controller?.abort()), []);

  const patchMessage = (messageId: Id, patch: Partial<Message>) => {
    setMessages((previous) => previous.map((message) => (message.id === messageId ? { ...message, ...patch } : message)));
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
    patchMessage(messageId, { upload_progress: Math.max(1, Math.min(99, Math.round(percent))) });
  };

  const markOptimisticUploadFailed = (messageId: Id, errorMessage?: string) => {
    patchMessage(messageId, { upload_status: 'failed', delivery_error: errorMessage || translationsRef.current.errorLoading || 'Upload failed' });
  };

  const settleOptimisticUpload = (messageId: Id) => updateOptimisticUploadProgress(messageId, 99);

  const sendUploaded = (localId: Id, upload: Upload) => {
    if (!upload.attachmentId) return;
    sendMessageEvent(localId, {
      type: 'message',
      data: { type: upload.voice ? 'voice' : 'file', attachment_id: upload.attachmentId, content: upload.caption.trim() || null },
    }, () => uploadsRef.current.delete(localId));
  };

  // Uploads the file of an optimistic message and sends the message that refers to it. Voice messages are
  // uploaded with kind "voice", so the server measures them.
  const runUpload = async (localId: Id, upload: Upload) => {
    const controller = new AbortController();
    upload.controller = controller;
    uploadsRef.current.set(localId, upload);
    try {
      const attachment = await uploadAttachmentWithProgress(upload.file, {
        purpose: 'message',
        kind: upload.voice ? 'voice' : undefined,
        fileName: upload.fileName,
        onProgress: (percent) => updateOptimisticUploadProgress(localId, percent),
        signal: controller.signal,
      });
      upload.controller = undefined;
      upload.attachmentId = attachment.id;
      settleOptimisticUpload(localId);
      sendUploaded(localId, upload);
      return true;
    } catch (error) {
      upload.controller = undefined;
      if (isAbortError(error)) return false;
      markOptimisticUploadFailed(localId, apiErrorMessage(error, translationsRef.current.errorLoading || 'Upload failed'));
      return false;
    }
  };

  const sendAttachment = (localId: Id, file: Blob, fileName: string, options: { voice?: boolean; caption?: string } = {}) => (
    runUpload(localId, { file, fileName, voice: Boolean(options.voice), caption: options.caption ?? '' })
  );

  // Cancels an upload in flight and removes its message.
  const cancelUpload = (localId: Id) => {
    const upload = uploadsRef.current.get(localId);
    uploadsRef.current.delete(localId);
    upload?.controller?.abort();
    setMessages((previous) => previous.filter((message) => {
      if (message.id !== localId) return true;
      if (message.local_object_url) URL.revokeObjectURL(message.local_object_url);
      return false;
    }));
  };

  // Tries a failed file message again: the upload if it did not finish, else only the message. False when
  // the file is no longer known (e.g. after a reload).
  const retryUpload = (localId: Id) => {
    const upload = uploadsRef.current.get(localId);
    if (!upload) return false;
    patchMessage(localId, { upload_status: upload.attachmentId ? undefined : 'uploading', upload_progress: 1, delivery_error: undefined });
    if (upload.attachmentId) sendUploaded(localId, upload);
    else void runUpload(localId, upload);
    return true;
  };

  const handleVoiceMessage = (file: Blob, fileName: string) => {
    const localId = createOptimisticUploadMessage(file, fileName, 'voice');
    void sendAttachment(localId, file, fileName, { voice: true });
  };

  // Several files become several messages, uploaded side by side; the caption goes with the first one.
  const handleFilesUpload = (files: File[], caption = '') => {
    files.forEach((file, index) => {
      const fileCaption = index === 0 ? caption : '';
      const localId = createOptimisticUploadMessage(file, file.name, undefined, fileCaption);
      void sendAttachment(localId, file, file.name, { caption: fileCaption });
    });
  };

  const handleFileUpload = async (file: File, caption = '') => {
    if (!file) return;
    handleFilesUpload([file], caption);
  };

  return {
    createOptimisticUploadMessage,
    updateOptimisticUploadProgress,
    markOptimisticUploadFailed,
    settleOptimisticUpload,
    sendAttachment,
    cancelUpload,
    retryUpload,
    handleVoiceMessage,
    handleFilesUpload,
    handleFileUpload,
  };
};
