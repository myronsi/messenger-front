import React from 'react';
import { Forward } from 'lucide-react';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { Message } from '../model/types';

interface ForwardedLabelProps {
  forwardedFrom: NonNullable<Message['forwarded_from']>;
  translations: Translations;
  isMine: boolean;
  isImage: boolean;
}

const ForwardedLabel: React.FC<ForwardedLabelProps> = ({ forwardedFrom, translations, isMine, isImage }) => {
  const sender = forwardedFrom.sender_name || forwardedFrom.sender_username || translations.deletedUser || 'Deleted User';
  const [before, after = ''] = (translations.forwardedFrom || 'Forwarded from {sender}').split('{sender}');
  return (
    <div
      data-testid="forwarded-label"
      className={`flex items-center gap-1 text-xs ${isImage ? 'w-0 min-w-full px-3 pb-1.5 pt-2' : 'mb-1 min-w-0'} ${isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
    >
      <Forward className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">
        {before.trimEnd()} <span className={`font-semibold ${isMine ? 'text-primary-foreground' : 'text-primary'}`}>{sender}</span>{after}
      </span>
    </div>
  );
};

export default ForwardedLabel;
