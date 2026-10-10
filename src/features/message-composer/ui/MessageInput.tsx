import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { File as FileIcon, Paperclip, Send, X, Mic, Square } from 'lucide-react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { UPLOAD_ACCEPT, validateUploadFile } from '@/shared/lib/uploadValidation';
import { useVoiceRecorder } from '../model/useVoiceRecorder';
import type { Id } from '@/shared/lib/ids';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (input: string) => void;
  replyTo: Message | null;
  editingMessage: Message | null;
  onSendMessage: () => void;
  onFileUpload: (file: File, caption?: string) => void;
  onCancelReplyOrEdit: () => void;
  chatId: Id;
  token: string;
  disableVoice?: boolean;
  isSending?: boolean;
  disabled?: boolean;
  onVoiceUploadStart?: (file: Blob, fileName: string, fileType?: string) => Id | null;
  onVoiceUploadProgress?: (messageId: Id, percent: number) => void;
  onVoiceUploadError?: (messageId: Id, errorMessage?: string) => void;
  onVoiceUploadComplete?: (messageId: Id) => void;
}

const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(({
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string | null>(null);
  const isDisabled = disabled || isSending;
  const hasSelectedFile = !!selectedFile;
  const hasDraft = messageInput.trim().length > 0 || hasSelectedFile;
  const {
    isRecording,
    isStarting,
    recordingDuration,
    errorMessage,
    setErrorMessage,
    stopRecording,
    handleStartRecording,
  } = useVoiceRecorder({
    chatId,
    isDisabled,
    disableVoice,
    onVoiceUploadStart,
    onVoiceUploadProgress,
    onVoiceUploadError,
    onVoiceUploadComplete,
  });

  const setInputNode = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const sendAndKeepFocus = () => {
    if (!hasDraft || isDisabled) return;
    if (selectedFile) {
      onFileUpload(selectedFile, messageInput);
      setSelectedFile(null);
      setMessageInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      onSendMessage();
    }
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const handleSelectedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    const validationError = file ? validateUploadFile(file) : null;
    if (file && validationError) {
      setErrorMessage(validationError === 'tooLarge'
        ? translations.uploadFileTooLarge || 'File is too large. The maximum size is 10 MB.'
        : translations.uploadUnsupportedType || 'This file type is not supported.');
      setSelectedFile(null);
      event.target.value = '';
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setSelectedFilePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleActionClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isStarting && hasDraft) {
      sendAndKeepFocus();
    } else if (!isStarting) {
      void handleStartRecording();
    }
  };

  return (
    <div className="pointer-events-auto px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 md:px-0">
      <div className="mx-auto flex w-full flex-col gap-2 md:w-2/3">
        {(replyTo || editingMessage) && (
          <div className="motion-reply-in flex items-center rounded-2xl border border-border/60 bg-background/55 p-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {replyTo ? 'Replying to: ' : 'Editing: '}
              </span>
              {(() => {
                const content = (replyTo || editingMessage)?.content;
                if (typeof content === 'string') return <span className="text-sm text-foreground">{content}</span>;
                if (content && 'file_type' in content && content.file_type.startsWith('image/')) {
                  return <img src={content.file_url} alt={content.file_name} className="h-8 w-8 object-cover rounded" />;
                }
                if (content && 'file_name' in content) return <span className="text-sm text-foreground">{content.file_name}</span>;
                return null;
              })()}
            </div>
            <button onClick={onCancelReplyOrEdit} aria-label={translations.cancel || 'Cancel'} className="motion-press rounded-full p-1 transition-colors hover:bg-accent">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="motion-error-in rounded-2xl bg-red-100 p-2 text-sm text-red-700 shadow-sm">
            {errorMessage}
            <button onClick={() => setErrorMessage(null)} className="motion-press ml-2 rounded px-1 text-red-700 hover:text-red-900">
              Close
            </button>
          </div>
        )}
        {selectedFile && (
          <div className="motion-reply-in flex justify-start">
            <div className="flex max-w-[min(100%,24rem)] items-center gap-2 rounded-2xl border border-border/60 bg-background/55 px-2 py-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl">
              {selectedFilePreviewUrl ? (
                <img src={selectedFilePreviewUrl} alt={selectedFile.name} className="h-11 w-11 rounded-xl object-cover" />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                  <FileIcon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{selectedFile.name}</div>
                <div className="text-xs text-muted-foreground">{Math.ceil(selectedFile.size / 1024)} KB</div>
              </div>
              <button type="button" onClick={clearSelectedFile} aria-label={translations.removeFile || 'Remove file'} className="motion-press shrink-0 rounded-full p-1 transition-colors hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border/60 bg-background/55 px-2 py-2 shadow-xl shadow-foreground/10 backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={translations.attachFile || 'Attach file'}
              disabled={isDisabled || isRecording || isStarting}
              className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              data-testid="message-file-input"
              onChange={handleSelectedFileChange}
              accept={UPLOAD_ACCEPT}
              className="hidden"
            />
            {isRecording ? (
              <div className="motion-reply-in flex min-h-10 flex-1 items-center justify-center rounded-full bg-red-50 px-3 text-sm text-red-600">
                <span className="mr-2 h-2 w-2 rounded-full bg-red-500 motion-presence" />
                <span className="font-semibold">{recordingDuration}s</span>
                <button type="button" onClick={() => stopRecording({ discard: true })} aria-label="Cancel recording" className="motion-press ml-3 rounded-full p-1 text-red-600 transition-colors hover:bg-red-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                ref={setInputNode}
                data-testid="message-input-field"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder={disabled ? (translations.waitingForApproval || 'Waiting for user approval') : selectedFile ? (translations.addCaption || 'Add a caption') : translations.writeMessage}
                className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none"
                onKeyDown={(event) => event.key === 'Enter' && sendAndKeepFocus()}
                disabled={isDisabled}
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleActionClick}
            disabled={isRecording ? false : isStarting || (hasDraft ? isDisabled : disableVoice || isDisabled)}
            aria-label={isRecording ? 'Stop recording and send' : hasDraft ? 'Send message' : 'Record voice message'}
            className={`motion-press relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full transition-colors duration-200 ${
              isRecording ? 'motion-presence bg-red-500 text-white' : hasDraft ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-accent text-accent-foreground hover:bg-accent/90'
            } disabled:opacity-50`}
          >
            <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${hasDraft && !isRecording ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-75 opacity-0'}`}>
              <Send className="h-6 w-6" />
            </span>
            <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${hasDraft || isRecording ? '-translate-y-2 scale-75 opacity-0' : 'translate-y-0 scale-100 opacity-100'}`}>
              <Mic className="h-6 w-6" />
            </span>
            <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${isRecording ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-75 opacity-0'}`}>
              <Square className="h-5 w-5 fill-current" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default MessageInput;
