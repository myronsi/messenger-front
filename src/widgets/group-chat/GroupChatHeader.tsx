import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLongPress } from '@/shared/lib/useLongPress';
import type { GroupTranslations } from './groupChatTypes';
import type { EntityId } from '@/shared/api/entityId';
import { CallButton, OngoingCallBanner } from '@/features/calls';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { participantCountLabel } from './groupChatUtils';

interface GroupChatHeaderProps {
  chatId?: EntityId;
  name: string;
  avatar: string;
  participantCount: number;
  description?: string;
  translations: GroupTranslations;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenSearch?: () => void;
}

const GroupChatHeader: React.FC<GroupChatHeaderProps> = ({
  chatId, name, avatar, participantCount, description, translations, onBack, onOpenProfile, onOpenSearch,
}) => {
  const longPress = useLongPress(onOpenSearch);
  const { language } = useLanguage();
  return (
    <>
      <div data-testid="chat-header" {...longPress.handlers}
        className="motion-panel-in flex h-[72px] shrink-0 items-center justify-between border-b border-border pl-1.5 pr-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center space-x-1 md:space-x-0">
          <button onClick={onBack} aria-label={translations.back || 'Back'} className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => { if (!longPress.consumeClick()) onOpenProfile(); }}
            className="motion-press flex min-w-0 flex-1 items-center space-x-2 rounded-lg px-1 py-1 text-left outline-none focus:outline-none md:space-x-0"
          >
            <AuthenticatedImage src={avatar} alt={name} className="motion-avatar h-9 w-9 rounded-full border border-border object-cover md:hidden" />
            <span className="flex min-w-0 flex-col items-start">
              <span className="max-w-full truncate text-base font-semibold leading-tight sm:text-lg">{name}</span>
              <span className="max-w-full truncate text-xs font-normal text-muted-foreground">
                {participantCountLabel(participantCount, translations, language)}
                {description ? ` - ${description}` : ''}
              </span>
            </span>
          </button>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          <CallButton chatId={chatId} />
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label={translations.search || 'Search'}
              title={translations.search || 'Search'}
              className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <OngoingCallBanner chatId={chatId} />
    </>
  );
};

export default GroupChatHeader;
