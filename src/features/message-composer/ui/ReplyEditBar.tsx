import React from 'react';
import { File as FileIcon, Mic, Pencil, Reply, X } from 'lucide-react';
import { formatAudioTime, type Message } from '@/entities/message';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';

interface ReplyEditBarProps {
  message: Message;
  mode: 'reply' | 'edit';
  translations: Translations;
  onCancel: () => void;
  showCancel?: boolean;
}

const preview = (message: Message, voiceLabel: string): { text: string; imageUrl?: string; isFile?: boolean; isVoice?: boolean } => {
  const { content } = message;
  if (typeof content === 'string') return { text: content.replace(/\s+/g, ' ').trim() };
  if (content?.file_type === 'voice') {
    const seconds = content.audio_metadata?.duration;
    return { text: seconds ? `${voiceLabel} · ${formatAudioTime(seconds)}` : voiceLabel, isVoice: true };
  }
  if (content && 'file_type' in content && content.file_type?.startsWith('image/')) {
    return { text: content.caption || content.file_name, imageUrl: content.thumbnail_url || content.file_url };
  }
  if (content && 'file_name' in content) return { text: content.caption || content.file_name, isFile: true };
  return { text: '' };
};

const ReplyEditBar: React.FC<ReplyEditBarProps> = ({ message, mode, translations, onCancel, showCancel = true }) => {
  const { text, imageUrl, isFile, isVoice } = preview(message, translations.voiceMessage || 'Voice message');
  const Icon = mode === 'reply' ? Reply : Pencil;
  const label = mode === 'reply' ? translations.replyTo || 'Reply to' : translations.editing || 'Editing';
  const author = mode === 'reply' ? message.sender : null;

  return (
    <div
      data-testid="reply-edit-bar"
      className="motion-reply-in flex min-w-0 items-center gap-2 rounded-2xl border border-border/60 bg-background/55 p-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      {imageUrl && <AuthenticatedImage src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />}
      {isFile && <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      {isVoice && <Mic className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <div className="min-w-0 flex-1 border-l-2 border-primary pl-2">
        <div className="truncate text-xs font-medium text-primary">
          {label}{author ? ` ${author}` : ''}
        </div>
        <div className="truncate text-sm text-foreground" title={text}>{text}</div>
      </div>
      {showCancel && (
        <button
          type="button"
          onPointerDown={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCancel}
          aria-label={translations.cancel || 'Cancel'}
          className="motion-press shrink-0 rounded-full p-1 transition-colors hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default ReplyEditBar;
