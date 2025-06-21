import React, { useRef, forwardRef } from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import { Message } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (input: string) => void;
  replyTo: Message | null;
  editingMessage: Message | null;
  onSendMessage: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelReplyOrEdit: () => void;
}

// Use forwardRef to allow parent components to pass a ref to the input
const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(
  ({
    messageInput,
    setMessageInput,
    replyTo,
    editingMessage,
    onSendMessage,
    onFileUpload,
    onCancelReplyOrEdit,
  }, ref) => {
    const { translations } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="flex space-x-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            accept="image/*,video/mp4,video/mov,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <input
            type="text"
            ref={ref} // Attach the forwarded ref to the text input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={translations.writeMessage}
            className="flex-1 px-4 py-2 bg-background text-foreground border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
          />
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
