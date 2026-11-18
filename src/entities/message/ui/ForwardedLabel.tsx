import React from 'react';
import { Forward } from 'lucide-react';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { apiClient } from '@/shared/api/client';
import { contractData } from '@/shared/api/tasks';
import type { Message } from '../model/types';
import { EmojiText } from '@/shared/ui/CustomEmoji';

interface ForwardedLabelProps {
  forwardedFrom: NonNullable<Message['forwarded_from']>;
  translations: Translations;
  isMine: boolean;
  isImage: boolean;
  onOpenSender?: (username: string) => void;
}

const ForwardedLabel: React.FC<ForwardedLabelProps> = ({ forwardedFrom, translations, isMine, isImage, onOpenSender }) => {
  const sender = forwardedFrom.sender_name || forwardedFrom.sender_username || translations.deletedUser || 'Deleted User';
  const [before, after = ''] = (translations.forwardedFrom || 'Forwarded from {sender}').split('{sender}');
  const senderId = forwardedFrom.sender_id;
  const nameClass = `font-semibold ${isMine ? 'text-primary-foreground' : 'text-primary'}`;
  const openSender = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!senderId || !onOpenSender) return;
    const user = await apiClient.GET('/users/{user_id}', { params: { path: { user_id: String(senderId) } } }).then(contractData).catch(() => null);
    if (user && !user.is_deleted) onOpenSender(user.username);
  };
  return (
    <div
      data-testid="forwarded-label"
      className={`flex items-center gap-1 text-xs ${isImage ? 'w-0 min-w-full px-3 pb-1.5 pt-2' : 'mb-1 min-w-0'} ${isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
    >
      <Forward className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">
        {before.trimEnd()}{' '}
        {senderId && onOpenSender ? (
          <button type="button" data-testid="forwarded-sender-link" onClick={(event) => void openSender(event)} className={`${nameClass} hover:underline`}>
            <EmojiText text={sender} />
          </button>
        ) : (
          <span data-testid="forwarded-sender-name" className={nameClass}><EmojiText text={sender} /></span>
        )}
        {after}
      </span>
    </div>
  );
};

export default ForwardedLabel;
