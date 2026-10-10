import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { Id } from '@/shared/lib/ids';
import type { Message } from '../model/types';

interface MessageDeliveryActionsProps {
  message: Message;
  isMine: boolean;
  translations: Translations;
  onResendMessage?: (message: Message) => void;
  onCancelUpload?: (messageId: Id) => void;
}

// Under a message being sent: cancelling its upload, or why it failed and sending it again.
const MessageDeliveryActions: React.FC<MessageDeliveryActionsProps> = ({ message, isMine, translations, onResendMessage, onCancelUpload }) => {
  if (isMine && message.upload_status === 'uploading' && onCancelUpload) {
    return (
      <div className="mt-1 flex text-[11px]">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-medium underline-offset-2 hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            onCancelUpload(message.id);
          }}
        >
          <X className="h-3 w-3" />
          {translations.cancelUpload}
        </button>
      </div>
    );
  }
  if (!message.delivery_error) return null;
  return (
    <div className={`mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-snug ${isMine ? 'text-red-100' : 'text-red-600'}`}>
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{message.delivery_error}</span>
      {isMine && onResendMessage && <button type="button" className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium underline-offset-2 hover:underline" onClick={(event) => {
        event.stopPropagation();
        onResendMessage(message);
      }}>{translations.resend || 'Resend'}</button>}
    </div>
  );
};

export default MessageDeliveryActions;
