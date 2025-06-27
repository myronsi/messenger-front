import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { Paperclip, Send, X, Mic } from 'lucide-react';
import { Message } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

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
      try {
        // Запрашиваем доступ к микрофону
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
            const response = await fetch(`${BASE_URL}/messages/vm`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            if (!response.ok) throw new Error('Failed to send voice message');
            // Очистка потоков после успешной отправки
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
        setErrorMessage(null); // Сбрасываем сообщение об ошибке при успешном начале записи
        timerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        // Показываем пользователю сообщение об ошибке
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
        // Очистка ресурсов при размонтировании компонента
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
      <div className="p-4 border-t border-border">
        {(replyTo || editingMessage) && (
          <div className="flex items-center mb-2 p-2 bg-accent rounded-lg">
            <span className="flex-1 text-sm text-muted-foreground">
              {replyTo
                ? `Replying to: ${typeof replyTo.content === 'string' ? replyTo.content : replyTo.content.file_name}`
                : `Editing: ${typeof editingMessage!.content === 'string' ? editingMessage!.content : editingMessage!.content.file_name}`}
            </span>
            <button onClick={onCancelReplyOrEdit} className="p-1 hover:bg-accent rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="mb-2 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
            {errorMessage}
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-2 text-red-700 hover:text-red-900"
            >
              Close
            </button>
          </div>
        )}
        <div className="flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
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
            <div className="flex-1 flex items-center justify-center bg-background border border-input rounded-lg p-2">
              <span className="text-red-500 font-bold">{recordingDuration}s</span>
            </div>
          ) : (
            <input
              type="text"
              ref={ref}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={translations.writeMessage}
              className="flex-1 pl-1 py-2 bg-background text-foreground border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            />
          )}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            onMouseLeave={stopRecording}
            className={`p-2 rounded-lg transition-colors ${
              isRecording ? 'bg-red-500 text-white' : 'bg-accent text-accent-foreground hover:bg-accent/90'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={onSendMessage}
            disabled={!messageInput.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }
);

export default MessageInput;
