import type { EntityId } from '@/shared/api/entityId';
import { isMobileComposer, isMobileKeyboardOpen } from '@/shared/lib/composerFocus';
import React, { useCallback, useRef, forwardRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Paperclip, Upload } from 'lucide-react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { UPLOAD_ACCEPT, uploadLimitMegabytes, validateUploadFile } from '@/shared/lib/uploadValidation';
import { useVoiceRecorder } from '../model/useVoiceRecorder';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { useHoldToRecord } from '../model/useHoldToRecord';
import ReplyEditBar from './ReplyEditBar';
import ComposerActionButton from './ComposerActionButton';
import ComposerNotice from './ComposerNotice';
import RecordingBar from './RecordingBar';
import SelectedFileChip from './SelectedFileChip';
import { useFileDrop } from '../model/useFileDrop';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (input: string) => void;
  replyTo: Message | null;
  editingMessage: Message | null;
  onSendMessage: () => void;
  onFileUpload: (file: File, caption?: string) => void;
  onCancelReplyOrEdit: () => void;
  chatId: EntityId;
  token: string;
  disableVoice?: boolean;
  isSending?: boolean;
  disabled?: boolean;
  onVoiceUploadStart?: (file: Blob, fileName: string, fileType?: string) => number | null;
  onVoiceUploadProgress?: (messageId: EntityId, percent: number) => void;
  onVoiceUploadError?: (messageId: EntityId, errorMessage?: string) => void;
  onVoiceUploadComplete?: (messageId: EntityId, created?: unknown) => void;
}

const editableCaption = (message: Message | null) => (typeof message?.content === 'string' ? message.content : message?.content?.caption || '');
const MAX_MESSAGE_LENGTH = 4096;
const sendsOnEnter = () => !window.matchMedia?.('(pointer: coarse)').matches;

const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(({
  messageInput,
  setMessageInput,
  replyTo,
  editingMessage,
  onSendMessage,
  onFileUpload,
  onCancelReplyOrEdit,
  chatId,
  disableVoice = false,
  isSending = false,
  disabled = false,
  onVoiceUploadStart,
  onVoiceUploadProgress,
  onVoiceUploadError,
  onVoiceUploadComplete,
}, ref) => {
  const { translations } = useLanguage();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const replyToRef = useLatestRef(replyTo);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string | null>(null);
  const isDisabled = disabled || isSending;
  const isEditing = !!editingMessage;
  const hasSelectedFile = !!selectedFile && !isEditing;
  const hasDraft = messageInput.trim().length > 0 || hasSelectedFile;
  const isUnchangedEdit = isEditing && messageInput.trim() === editableCaption(editingMessage).trim();
  const canSend = (hasDraft || isEditing) && !isUnchangedEdit;
  const {
    isRecording, isStarting, recordingDuration, liveStream, isPaused, togglePause,
    errorMessage, setErrorMessage, stopRecording, handleStartRecording,
  } = useVoiceRecorder({
    chatId, isDisabled, disableVoice, onVoiceUploadStart, onVoiceUploadProgress, onVoiceUploadError, onVoiceUploadComplete,
    getReplyToId: () => replyToRef.current?.id ?? null,
  });

  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    const fit = () => {
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [messageInput, isRecording]);

  const handleFieldKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || !sendsOnEnter()) return;
    event.preventDefault();
    sendAndKeepFocus();
  };

  const setInputNode = (node: HTMLTextAreaElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const sendAndKeepFocus = () => {
    if (isUnchangedEdit) {
      cancelKeepingFocus();
      return;
    }
    if (!canSend || isDisabled) return;
    const length = [...messageInput.trim()].length;
    if (length > MAX_MESSAGE_LENGTH) {
      setErrorMessage((translations.messageTooLong || 'Message is too long: {count} of {max} characters.').replace('{count}', String(length)).replace('{max}', String(MAX_MESSAGE_LENGTH)));
      return;
    }
    if (selectedFile && !isEditing) {
      onFileUpload(selectedFile, messageInput);
      setSelectedFile(null);
      setMessageInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      onSendMessage();
    }
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const selectFile = (file: File | null) => {
    const validationError = file ? validateUploadFile(file) : null;
    if (file && validationError) {
      setErrorMessage(validationError === 'tooLarge'
        ? (translations.uploadFileTooLarge || 'File is too large. The maximum size for this type is {size} MB.').replace('{size}', String(uploadLimitMegabytes(file.name)))
        : translations.uploadUnsupportedType || 'This file type is not supported.');
      setSelectedFile(null);
      return false;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    return true;
  };

  const handleSelectedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectFile(event.target.files?.[0] || null)) event.target.value = '';
  };

  const { zone: dropZone, isDragging } = useFileDrop(rootRef, (file) => {
    if (isEditing) {
      setErrorMessage(translations.attachDisabledWhileEditing);
      return;
    }
    if (isDisabled || isRecording || isStarting) return;
    selectFile(file);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  });

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!isEditing) return;
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [isEditing]);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setSelectedFilePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const dismissError = useCallback(() => setErrorMessage(null), [setErrorMessage]);

  const cancelKeepingFocus = () => {
    const field = inputRef.current;
    const keepFocus = document.activeElement === field && (!isMobileComposer() || (!isEditing && isMobileKeyboardOpen()));
    onCancelReplyOrEdit();
    if (keepFocus) field?.focus({ preventScroll: true });
    else if (isMobileComposer()) field?.blur();
  };

  const hold = useHoldToRecord({
    enabled: !canSend && !isUnchangedEdit && !isRecording && !isStarting && !disableVoice && !isDisabled,
    isRecording,
    isStarting,
    start: () => { void handleStartRecording(); },
    stop: () => stopRecording(),
    discard: () => stopRecording({ discard: true }),
  });

  const handleActionClick = () => {
    if (!hold.takeClick()) return;
    if (isUnchangedEdit) {
      cancelKeepingFocus();
      return;
    }
    if (isRecording) {
      stopRecording();
    } else if (!isStarting && canSend) {
      sendAndKeepFocus();
    } else if (!isStarting) {
      void handleStartRecording();
    }
  };

  return (
    <div ref={rootRef} className="pointer-events-auto px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 md:px-0">
      {isDragging && dropZone && createPortal(
        <div data-testid="file-drop-overlay" className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary px-8 py-6 text-primary">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">{isEditing ? translations.attachDisabledWhileEditing : translations.dropFileToAttach}</span>
          </div>
        </div>,
        dropZone,
      )}
      <div className="mx-auto flex w-full flex-col gap-2 md:w-2/3">
        {(editingMessage || replyTo) && (
          <ReplyEditBar
            message={(editingMessage || replyTo) as Message}
            mode={editingMessage ? 'edit' : 'reply'}
            translations={translations}
            onCancel={cancelKeepingFocus}
            showCancel={!isUnchangedEdit}
          />
        )}
        {errorMessage && (
          <ComposerNotice key={errorMessage} message={errorMessage} closeLabel={translations.close || 'Close'} onDismiss={dismissError} />
        )}
        {selectedFile && (
          <SelectedFileChip file={selectedFile} previewUrl={selectedFilePreviewUrl} removeLabel={translations.removeFile || 'Remove file'} onRemove={clearSelectedFile} />
        )}
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 items-end gap-2 rounded-[28px] border border-border/60 bg-background/55 px-2 py-2 shadow-xl shadow-foreground/10 backdrop-blur-2xl">
            {!isRecording && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={translations.attachFile || 'Attach file'}
                title={isEditing ? translations.attachDisabledWhileEditing : undefined}
                disabled={isDisabled || isRecording || isStarting || isEditing}
                className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              data-testid="message-file-input"
              onChange={handleSelectedFileChange}
              accept={UPLOAD_ACCEPT}
              className="hidden"
            />
            {isRecording ? (
              <RecordingBar
                seconds={recordingDuration}
                stream={liveStream}
                locked={hold.locked}
                paused={isPaused}
                pauseLabel={translations.pauseRecording}
                resumeLabel={translations.resumeRecording}
                onTogglePause={togglePause}
                onDiscard={() => stopRecording({ discard: true })}
              />
            ) : (
              <textarea
                rows={1}
                ref={setInputNode}
                data-testid="message-input-field"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder={disabled ? (translations.waitingForApproval || 'Waiting for user approval') : selectedFile ? (translations.addCaption || 'Add a caption')
                  : editingMessage?.type === 'file' ? translations.writeCaption : translations.writeMessage}
                className="block max-h-[min(10rem,35vh)] min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2 leading-6 text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none"
                onKeyDown={handleFieldKeyDown}
                disabled={isDisabled}
              />
            )}
          </div>
          <ComposerActionButton
            mode={isRecording ? 'recording' : isUnchangedEdit ? 'cancel' : canSend ? 'send' : 'voice'}
            disabled={isRecording || isUnchangedEdit ? false : isStarting || (canSend ? isDisabled : disableVoice || isDisabled)}
            cancelLabel={translations.cancel || 'Cancel'}
            onClick={handleActionClick}
            holding={hold.holding}
            lift={hold.lift}
            holdHandlers={hold.handlers}
          />
        </div>
      </div>
    </div>
  );
});

export default MessageInput;
