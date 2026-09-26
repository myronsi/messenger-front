import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { File as FileIcon, Paperclip, Send, X, Mic, Square } from 'lucide-react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const OPUS_AUDIO_BITS_PER_SECOND = 48_000;
// Recordings shorter than this are treated as accidental taps and are never sent.
const MIN_RECORDING_MS = 1000;
const RECORDING_TOO_SHORT_MESSAGE = 'Recording was too short and was not sent. Tap the mic to start, then tap stop when you are done.';
const OPUS_MIME_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/ogg; codecs=opus',
  'audio/webm;codecs=opus',
  'audio/webm; codecs=opus',
];

const getSupportedOpusMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }

  return OPUS_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
};

const getVoiceMessageFileName = (mimeType: string) => (
  mimeType.includes('webm') ? 'voice_message.webm' : 'voice_message.opus'
);

// State that belongs to exactly one recording. Keeping it per recording (instead of in shared refs)
// means a late `onstop` of an old recording can never be affected by a newly started one.
interface RecordingSession {
  chunks: Blob[];
  startedAt: number;
  discard: boolean;
}

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (input: string) => void;
  replyTo: Message | null;
  editingMessage: Message | null;
  onSendMessage: () => void;
  onFileUpload: (file: File, caption?: string) => void;
  onCancelReplyOrEdit: () => void;
  chatId: number;
  token: string;
  disableVoice?: boolean;
  isSending?: boolean;
  disabled?: boolean;
  onVoiceUploadStart?: (file: Blob, fileName: string, fileType?: string) => number | null;
  onVoiceUploadProgress?: (messageId: number, percent: number) => void;
  onVoiceUploadError?: (messageId: number, errorMessage?: string) => void;
  onVoiceUploadComplete?: (messageId: number) => void;
}

const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(
  ({
    messageInput,
    setMessageInput,
    replyTo,
    editingMessage,
    onSendMessage,
    onFileUpload,
    onCancelReplyOrEdit,
    chatId,
    token,
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
    const [isRecording, setIsRecording] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingSessionRef = useRef<RecordingSession | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingIntentRef = useRef(false);
    const isDisabled = disabled || isSending;
    const hasSelectedFile = !!selectedFile;
    const hasDraft = messageInput.trim().length > 0 || hasSelectedFile;

    const setInputNode = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const sendAndKeepFocus = () => {
      if (!hasDraft || isDisabled) return;
      if (selectedFile) {
        onFileUpload(selectedFile, messageInput);
        setSelectedFile(null);
        setMessageInput('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        requestAnimationFrame(() => {
          inputRef.current?.focus({ preventScroll: true });
        });
        return;
      }
      onSendMessage();
      requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
      });
    };

    const handleSelectedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      setSelectedFile(file);
    };

    const clearSelectedFile = () => {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

    const startRecording = async () => {
      if (disableVoice || isDisabled) return;
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
          setErrorMessage('Voice recording is not supported in this browser.');
          return;
        }

        const opusMimeType = getSupportedOpusMimeType();
        if (!opusMimeType) {
          setErrorMessage('Opus voice recording is not supported in this browser.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!recordingIntentRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream; // Сохраняем поток для последующей очистки
        const session: RecordingSession = { chunks: [], startedAt: 0, discard: false };
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: opusMimeType,
          audioBitsPerSecond: OPUS_AUDIO_BITS_PER_SECOND,
        });
        mediaRecorderRef.current = mediaRecorder;
        recordingSessionRef.current = session;

        const releaseRecorder = () => {
          stream.getTracks().forEach(track => track.stop());
          if (streamRef.current === stream) {
            streamRef.current = null;
          }
          if (mediaRecorderRef.current === mediaRecorder) {
            mediaRecorderRef.current = null;
          }
          if (recordingSessionRef.current === session) {
            recordingSessionRef.current = null;
          }
        };

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            session.chunks.push(event.data);
          }
        };
        mediaRecorder.onstop = async () => {
          // Cancelled or too-short recordings are dropped here: no blob, no optimistic message, no upload.
          if (session.discard) {
            session.chunks = [];
            releaseRecorder();
            return;
          }

          const audioBlob = new Blob(session.chunks, { type: mediaRecorder.mimeType || opusMimeType });
          session.chunks = [];

          if (audioBlob.size === 0) {
            setErrorMessage('Voice message was empty. Please try recording again.');
            releaseRecorder();
            return;
          }

          const formData = new FormData();
          const voiceFileName = getVoiceMessageFileName(audioBlob.type);
          const optimisticMessageId = onVoiceUploadStart?.(audioBlob, voiceFileName, 'voice') ?? null;
          formData.append('file', audioBlob, voiceFileName);
          formData.append('chat_id', chatId.toString());
          try {
            await uploadWithProgress({
              url: `${BASE_URL}/messages/vm`,
              formData,
              onProgress: (percent) => {
                if (optimisticMessageId !== null) {
                  onVoiceUploadProgress?.(optimisticMessageId, percent);
                }
              },
            });
            if (optimisticMessageId !== null) {
              onVoiceUploadComplete?.(optimisticMessageId);
            }
          } catch (err) {
            console.error('Error sending voice message:', err);
            if (optimisticMessageId !== null) {
              onVoiceUploadError?.(optimisticMessageId, 'Failed to send voice message. Please try again.');
            }
            setErrorMessage('Failed to send voice message. Please try again.');
          } finally {
            releaseRecorder();
          }
        };
        mediaRecorder.start();
        session.startedAt = performance.now();
        setIsRecording(true);
        setErrorMessage(null);
        timerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setErrorMessage('Microphone access was denied. Please allow access in your browser settings.');
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
          setErrorMessage('No microphone found. Please connect a microphone and try again.');
        } else {
          setErrorMessage('Failed to access microphone. Please check your settings.');
        }
        // Setup failed after the stream was opened: release the microphone.
        if (!mediaRecorderRef.current && streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    };

    // Ends the current recording. By default the audio is sent (from the recorder's onstop handler),
    // unless it is shorter than MIN_RECORDING_MS or `discard` is set, in which case it is thrown away.
    const stopRecording = ({ discard = false }: { discard?: boolean } = {}) => {
      recordingIntentRef.current = false;
      const session = recordingSessionRef.current;
      const recorder = mediaRecorderRef.current;
      if (session && recorder && recorder.state !== 'inactive') {
        if (discard) {
          session.discard = true;
        } else if (performance.now() - session.startedAt < MIN_RECORDING_MS) {
          session.discard = true;
          setErrorMessage(RECORDING_TOO_SHORT_MESSAGE);
        }
        recorder.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);
    };

    // Leaving the chat (or unmounting) while recording discards the recording instead of sending it.
    useEffect(() => {
      return () => {
        stopRecording({ discard: true });
        if (streamRef.current && !mediaRecorderRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId]);

    const handleStartRecording = async () => {
      if (disableVoice || isDisabled) return;
      recordingIntentRef.current = true;
      setIsStarting(true);
      try {
        await startRecording();
      } finally {
        setIsStarting(false);
        if (mediaRecorderRef.current?.state !== 'recording') {
          recordingIntentRef.current = false;
        }
      }
    };

    // One click = one action: start recording, stop (and send) the recording, or send the draft.
    const handleActionClick = () => {
      if (isRecording) {
        stopRecording();
        return;
      }
      if (isStarting) return;
      if (hasDraft) {
        sendAndKeepFocus();
        return;
      }
      void handleStartRecording();
    };

    return (
      <div className="pointer-events-auto px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 md:px-0">
        <div className="mx-auto flex w-full flex-col gap-2 md:w-2/3">
        {(replyTo || editingMessage) && (
          <div className="motion-reply-in flex items-center rounded-2xl border border-border/60 bg-background/55 p-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {replyTo
                  ? "Replying to: "
                  : "Editing: "}
              </span>
              {(() => {
                const content = (replyTo || editingMessage)?.content;
                if (typeof content === 'string') {
                  return (
                    <span className="text-sm text-foreground">
                      {content}
                    </span>
                  );
                } else if (content && 'file_type' in content && content.file_type.startsWith('image/')) {
                  return (
                    <img
                      src={content.file_url}
                      alt={content.file_name}
                      className="h-8 w-8 object-cover rounded"
                    />
                  );
                } else if (content && 'file_name' in content) {
                  return (
                    <span className="text-sm text-foreground">
                      {content.file_name}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <button onClick={onCancelReplyOrEdit} className="motion-press rounded-full p-1 transition-colors hover:bg-accent">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="motion-error-in rounded-2xl bg-red-100 p-2 text-sm text-red-700 shadow-sm">
            {errorMessage}
            <button
              onClick={() => setErrorMessage(null)}
              className="motion-press ml-2 rounded px-1 text-red-700 hover:text-red-900"
            >
              Close
            </button>
          </div>
        )}
        {selectedFile && (
          <div className="motion-reply-in flex justify-start">
            <div className="flex max-w-[min(100%,24rem)] items-center gap-2 rounded-2xl border border-border/60 bg-background/55 px-2 py-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl">
              {selectedFilePreviewUrl ? (
                <img
                  src={selectedFilePreviewUrl}
                  alt={selectedFile.name}
                  className="h-11 w-11 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                  <FileIcon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{selectedFile.name}</div>
                <div className="text-xs text-muted-foreground">{Math.ceil(selectedFile.size / 1024)} KB</div>
              </div>
              <button
                type="button"
                onClick={clearSelectedFile}
                className="motion-press shrink-0 rounded-full p-1 transition-colors hover:bg-accent"
              >
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
              disabled={isDisabled || isRecording || isStarting}
              className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSelectedFileChange}
              accept="image/*,video/mp4,video/mov,.pdf,.doc,.docx,.txt"
              className="hidden"
            />
            {isRecording ? (
              <div className="motion-reply-in flex min-h-10 flex-1 items-center justify-center rounded-full bg-red-50 px-3 text-sm text-red-600">
                <span className="mr-2 h-2 w-2 rounded-full bg-red-500 motion-presence" />
                <span className="font-semibold">{recordingDuration}s</span>
                <button
                  type="button"
                  onClick={() => stopRecording({ discard: true })}
                  aria-label="Cancel recording"
                  className="motion-press ml-3 rounded-full p-1 text-red-600 transition-colors hover:bg-red-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                ref={setInputNode}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={disabled ? (translations.waitingForApproval || 'Waiting for user approval') : selectedFile ? (translations.addCaption || 'Add a caption') : translations.writeMessage}
                className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && sendAndKeepFocus()}
                disabled={isDisabled}
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleActionClick}
            // While recording the button must stay usable so the recording can always be stopped.
            disabled={isRecording ? false : isStarting || (hasDraft ? isDisabled : disableVoice || isDisabled)}
            aria-label={isRecording ? 'Stop recording and send' : hasDraft ? 'Send message' : 'Record voice message'}
            className={`motion-press relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full transition-colors duration-200 ${
              isRecording
                ? 'motion-presence bg-red-500 text-white'
                : hasDraft
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-accent text-accent-foreground hover:bg-accent/90'
            } disabled:opacity-50`}
          >
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${
                hasDraft && !isRecording ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-75 opacity-0'
              }`}
            >
              <Send className="h-6 w-6" />
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${
                hasDraft || isRecording ? '-translate-y-2 scale-75 opacity-0' : 'translate-y-0 scale-100 opacity-100'
              }`}
            >
              <Mic className="h-6 w-6" />
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${
                isRecording ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-75 opacity-0'
              }`}
            >
              <Square className="h-5 w-5 fill-current" />
            </span>
          </button>
        </div>
        </div>
      </div>
    );
  }
);

export default MessageInput;