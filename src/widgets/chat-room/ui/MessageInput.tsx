import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { Paperclip, Send, X, Mic } from 'lucide-react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { authFetch } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (input: string) => void;
  replyTo: Message | null;
  editingMessage: Message | null;
  onSendMessage: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelReplyOrEdit: () => void;
  chatId: number;
  token: string;
  disableVoice?: boolean;
  isSending?: boolean;
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
  }, ref) => {
    const { translations } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = async () => {
      if (disableVoice) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream; // Сохраняем поток для последующей очистки
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
          audioChunksRef.current = [];
          const formData = new FormData();
          formData.append('file', audioBlob, 'voice_message.opus');
          formData.append('chat_id', chatId.toString());
          try {
            const response = await authFetch(`${BASE_URL}/messages/vm`, {
              method: 'POST',
              body: formData,
            });
            if (!response.ok) throw new Error('Failed to send voice message');
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
          } catch (err) {
            console.error('Error sending voice message:', err);
            setErrorMessage('Failed to send voice message. Please try again.');
          }
        };
        mediaRecorderRef.current.start();
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
      } 
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);
    };

    useEffect(() => {
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
    }, []);

    return (
      <div className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {(replyTo || editingMessage) && (
          <div className="motion-reply-in flex items-center mb-2 p-2 bg-accent rounded-lg">
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
            <button onClick={onCancelReplyOrEdit} className="motion-press p-1 hover:bg-accent rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="motion-error-in mb-2 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
            {errorMessage}
            <button
              onClick={() => setErrorMessage(null)}
              className="motion-press ml-2 rounded px-1 text-red-700 hover:text-red-900"
            >
              Close
            </button>
          </div>
        )}
        <div className="flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="motion-press p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            accept="image/*,video/mp4,video/mov,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          {isRecording ? (
            <div className="motion-reply-in flex-1 flex items-center justify-center bg-background border border-input rounded-lg p-2">
              <span className="text-red-500 font-bold">{recordingDuration}s</span>
            </div>
          ) : (
            <input
              type="text"
              ref={ref}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={translations.writeMessage}
              className="flex-1 pl-3 py-2 bg-background text-foreground border border-input rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-sm"
              onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
              disabled={isSending}
            />
          )}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            onMouseLeave={stopRecording}
            disabled={disableVoice || isSending}
            className={`motion-press p-2 rounded-lg transition-colors ${
              isRecording ? 'motion-presence bg-red-500 text-white' : 'bg-accent text-accent-foreground hover:bg-accent/90'
            } disabled:opacity-50`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={onSendMessage}
            disabled={!messageInput.trim() || isSending}
            className="motion-press p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }
);

export default MessageInput;
