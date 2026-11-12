import type { EntityId } from '@/shared/api/entityId';
import { isMobileComposer, isMobileKeyboardOpen } from '@/shared/lib/composerFocus';
import React, { useCallback, useRef, forwardRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Paperclip, Upload } from 'lucide-react';
import { Message } from '@/entities/message';
import { useTypingStatus } from '@/entities/typing';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { UPLOAD_ACCEPT } from '@/shared/lib/uploadValidation';
import { canCompressImage, compressImagesForUpload } from '@/shared/lib/compressImage';
import { isGoApi } from '@/shared/api/goSocket';
import { useVoiceRecorder } from '../model/useVoiceRecorder';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { useHoldToRecord } from '../model/useHoldToRecord';
import ReplyEditBar from './ReplyEditBar';
import { ComposerReveal } from './ComposerReveal';
import ComposerActionButton from './ComposerActionButton';
import ComposerNotice from './ComposerNotice';
import RecordingBar from './RecordingBar';
import VoicePreviewBar from './VoicePreviewBar';
import SelectedFiles from './SelectedFiles';
import { useFileDrop } from '../model/useFileDrop';
import { useFileDrawings } from '../model/useFileDrawings';
import { addToSelection, canAddToSelection, planUploads } from '../model/fileSelection';
import type { Drawing } from '@/shared/ui/drawing';
import type { Sticker } from '@/entities/sticker';
import EmojiStickerButton from './EmojiStickerButton';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (input: string) => void;
  replyTo: Message | null;
  editingMessage: Message | null;
  onSendMessage: () => void;
  onSendSticker?: (sticker: Sticker) => void;
  onFileUpload: (file: File | File[], caption?: string, drawings?: (Drawing | undefined)[]) => void;
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
  onSendMessage, onSendSticker,
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [emojiDock, setEmojiDock] = useState<HTMLDivElement | null>(null);
  const selectedFilesRef = useLatestRef(selectedFiles);
  const fileDrawings = useFileDrawings(selectedFiles);
  const albumsEnabled = isGoApi();
  const isDisabled = disabled || isSending;
  const isEditing = !!editingMessage;
  const hasSelectedFile = selectedFiles.length > 0 && !isEditing;
  const hasDraft = messageInput.trim().length > 0 || hasSelectedFile;
  const isUnchangedEdit = isEditing && messageInput.trim() === editableCaption(editingMessage).trim();
  const {
    isRecording, isStarting, recordingDuration, liveStream, isPaused, togglePause,
    errorMessage, setErrorMessage, stopRecording, handleStartRecording, preview: voicePreview, sendPreview, discardPreview, setPreviewTrim,
  } = useVoiceRecorder({
    chatId, isDisabled, disableVoice, onVoiceUploadStart, onVoiceUploadProgress, onVoiceUploadError, onVoiceUploadComplete,
    getReplyToId: () => replyToRef.current?.id ?? null,
  });
  const canSend = ((hasDraft || isEditing) && !isUnchangedEdit) || !!voicePreview;
  useTypingStatus({ chatId, text: messageInput, canType: !isEditing && !disabled, isRecording });

  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    const fit = () => {
      field.style.height = 'auto';
      field.style.height = field.value ? `${field.scrollHeight}px` : '';
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
    if (hasSelectedFile) {
      planUploads(selectedFiles, messageInput, fileDrawings.drawingsOf).forEach((upload) => onFileUpload(upload.file, upload.caption, upload.drawings));
      setSelectedFiles([]);
      setMessageInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      onSendMessage();
    }
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const addFiles = (files: File[]) => {
    const result = addToSelection(selectedFilesRef.current, files, albumsEnabled, translations);
    if (result.error !== undefined) {
      setErrorMessage(result.error);
      return;
    }
    setErrorMessage(result.notice ?? null);
    setSelectedFiles(result.files);
  };

  const selectFiles = (files: File[]) => {
    if (!files.length) return;
    if (files.some(canCompressImage)) void compressImagesForUpload(files).then(addFiles);
    else addFiles(files);
  };

  const handleSelectedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const { zone: dropZone, isDragging } = useFileDrop(rootRef, (files) => {
    if (isEditing) {
      setErrorMessage(translations.attachDisabledWhileEditing);
      return;
    }
    if (isDisabled || isRecording || isStarting) return;
    selectFiles(files);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  });

  useEffect(() => {
    if (isEditing) setSelectedFiles([]);
  }, [isEditing]);

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
    if (voicePreview) {
      void sendPreview();
    } else if (isRecording) {
      stopRecording({ preview: true });
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
        <ComposerReveal show={!!(editingMessage || replyTo)}>{(editingMessage || replyTo) && (
          <ReplyEditBar
            message={(editingMessage || replyTo) as Message}
            mode={editingMessage ? 'edit' : 'reply'}
            translations={translations}
            onCancel={cancelKeepingFocus}
            showCancel={!isUnchangedEdit}
          />
        )}</ComposerReveal>
        {errorMessage && (
          <ComposerNotice key={errorMessage} message={errorMessage} closeLabel={translations.close || 'Close'} onDismiss={dismissError} />
        )}
        <ComposerReveal show={hasSelectedFile}>{hasSelectedFile && (
          <SelectedFiles files={selectedFiles} removeLabel={translations.removeFile} addLabel={translations.attachFile}
            canAdd={albumsEnabled && canAddToSelection(selectedFiles) && !isDisabled}
            onAdd={() => fileInputRef.current?.click()}
            onRemove={(index) => setSelectedFiles(current => current.filter((_, item) => item !== index))}
            drawings={fileDrawings.drawings} onDrawingChange={isGoApi() ? fileDrawings.setDrawing : undefined} />
        )}</ComposerReveal>
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 items-end gap-2 rounded-[28px] border border-border/60 bg-background/55 px-2 py-2 backdrop-blur-2xl">
            {!isRecording && !voicePreview && (
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
            <input type="file" ref={fileInputRef} multiple={albumsEnabled} data-testid="message-file-input"
              onChange={handleSelectedFileChange} accept={UPLOAD_ACCEPT} className="hidden" />
            {isRecording ? (
              <RecordingBar seconds={recordingDuration} stream={liveStream} locked={hold.locked} paused={isPaused}
                pauseLabel={translations.pauseRecording} resumeLabel={translations.resumeRecording} onTogglePause={togglePause}
                cancelLabel={translations.voicePreviewDelete} onDiscard={() => stopRecording({ discard: true })} />
            ) : voicePreview ? (
              <VoicePreviewBar preview={voicePreview} onDiscard={discardPreview} onTrim={setPreviewTrim} />
            ) : (
              <textarea
                rows={1}
                ref={setInputNode}
                data-testid="message-input-field"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder={disabled ? (translations.waitingForApproval || 'Waiting for user approval') : hasSelectedFile ? (translations.addCaption || 'Add a caption')
                  : editingMessage?.type === 'file' ? translations.writeCaption : translations.writeMessage}
                className="block max-h-[min(10rem,35vh)] min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2 leading-6 text-foreground transition-colors placeholder:truncate placeholder:text-muted-foreground focus:outline-none"
                onKeyDown={handleFieldKeyDown}
                disabled={isDisabled}
              />
            )}
            {!isRecording && !voicePreview && <EmojiStickerButton inputRef={inputRef} value={messageInput} onChange={setMessageInput}
              disabled={isDisabled} dock={emojiDock}
              onSticker={onSendSticker && !isEditing && !hasSelectedFile ? onSendSticker : undefined} />}
          </div>
          <ComposerActionButton
            mode={isRecording ? 'recording' : isUnchangedEdit ? 'cancel' : canSend ? 'send' : 'voice'}
            disabled={isRecording || isUnchangedEdit ? false : isStarting || (canSend ? isDisabled : disableVoice || isDisabled)}
            editLabel={isEditing ? translations.saveMessageEdit : undefined}
            cancelLabel={translations.cancel || 'Cancel'}
            onClick={handleActionClick}
            holding={hold.holding}
            lift={hold.lift}
            holdHandlers={hold.handlers}
          />
        </div>
        <div ref={setEmojiDock} className="-mt-2 empty:hidden" />
      </div>
    </div>
  );
});
export default MessageInput;
