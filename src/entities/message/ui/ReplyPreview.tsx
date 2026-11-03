import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import { Message } from '../model/types';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useFileTypes } from '@/shared/contexts/fileTypesConfig';

interface ReplyPreviewProps {
  replyMessage: Message | undefined;
  isMine: boolean;
  isImage?: boolean;
  onClick?: () => void;
}

const IMAGE_NAME = /\.(jpg|jpeg|png|gif|webp)$/i;

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ replyMessage, isMine, isImage = false, onClick }) => {
  const { translations } = useLanguage();
  const { getFileTypeConfig } = useFileTypes();

  const describe = (message: Message | undefined): { text: string; imageUrl?: string; muted?: boolean } => {
    if (!message) return { text: translations.replyUnavailable, muted: true };
    if (message.is_deleted) return { text: translations.messageDeleted, muted: true };
    if (message.type === 'file' && typeof message.content !== 'string') {
      const { file_name: fileName = '', file_type: fileType, caption, thumbnail_url: thumbnail, file_url: url } = message.content;
      if (fileType === 'voice') return { text: translations.voiceMessage };
      if (url && IMAGE_NAME.test(fileName)) return { text: caption || '', imageUrl: resolveMediaUrl(thumbnail || url) };
      return { text: caption || getFileTypeConfig(fileName)?.replyText || fileName || 'File' };
    }
    return { text: typeof message.content === 'string' ? message.content : message.content.file_name || 'File' };
  };

  const content = describe(replyMessage);
  const sender = replyMessage?.sender || '';

  return (
    <button
      type="button"
      data-testid="reply-preview"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={`flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border-l-[3px] py-1 pl-2 pr-2.5 text-left transition-colors ${
        isImage ? 'mx-1.5 mb-1.5 mt-1.5 w-[calc(100%-0.75rem)] max-w-[calc(100%-0.75rem)]' : 'mb-1.5 w-full max-w-full'
      } ${isMine ? 'border-white/80 bg-white/15 hover:bg-white/20' : 'border-primary bg-primary/10 hover:bg-primary/15'}`}
    >
      {content.imageUrl && (
        <AuthenticatedImage src={content.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" draggable={false} />
      )}
      <span className="min-w-0 flex-1">
        {sender && (
          <span className={`block truncate text-xs font-semibold ${isMine ? 'text-primary-foreground' : 'text-primary'}`}>{sender}</span>
        )}
        {(content.text || !sender) && (
          <span className={`block truncate text-[13px] leading-snug ${content.muted ? 'italic opacity-70' : ''} ${isMine ? 'text-primary-foreground/85' : 'text-foreground/80'}`}>
            {content.text || translations.image}
          </span>
        )}
      </span>
    </button>
  );
};

export default ReplyPreview;
