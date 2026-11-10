import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { usePresenceLabel } from '@/shared/utils/presenceFormatters';
import { useLongPress } from '@/shared/lib/useLongPress';
import type { EntityId } from '@/shared/api/entityId';
import { CallButton, OngoingCallBanner } from '@/features/calls';

interface ChatHeaderProps {
  chatId?: EntityId;
  chatName: string;
  chatDisplayName?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  interlocutorDeleted: boolean;
  onBack: () => void;
  onDeleteChat: () => void;
  onOpenProfile: () => void;
  onOpenSearch?: () => void;
  interlocutorAvatar: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatId, chatName, chatDisplayName, isOnline, lastSeen, interlocutorDeleted, onBack, onOpenProfile,
  onOpenSearch, interlocutorAvatar,
}) => {
  const { translations } = useLanguage();
  const presenceLabel = usePresenceLabel(isOnline, lastSeen);
  const displayName = chatDisplayName || chatName;
  const longPress = useLongPress(onOpenSearch);

  return (
    <>
      <div data-testid="chat-header" {...longPress.handlers} className="motion-panel-in h-[72px] shrink-0 px-4 sm:px-6 border-b border-border flex justify-between items-center">
        <div className="flex min-w-0 items-center space-x-4 md:space-x-0">
          <button onClick={onBack} aria-label={translations.back || 'Back'} className="motion-press flex h-11 w-11 shrink-0 items-center justify-center hover:bg-accent rounded-full transition-colors md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={() => { if (!longPress.consumeClick() && !interlocutorDeleted) onOpenProfile(); }} className="motion-press flex min-w-0 items-center space-x-2 rounded-lg px-1 py-1 md:space-x-0">
            <AuthenticatedImage src={interlocutorAvatar} alt={displayName} className="motion-avatar w-9 h-9 rounded-full border border-border object-cover md:hidden" />
            <span className="flex min-w-0 flex-col items-start">
              <span className="max-w-[52vw] truncate text-base font-semibold leading-tight sm:max-w-none sm:text-lg">{interlocutorDeleted ? translations.deletedUser || 'Deleted User' : displayName}</span>
              {!interlocutorDeleted && (
                <span className="text-xs font-normal text-muted-foreground">
                  {presenceLabel}
                </span>
              )}
            </span>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!interlocutorDeleted && <CallButton chatId={chatId} />}
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
      {!interlocutorDeleted && <OngoingCallBanner chatId={chatId} />}
    </>
  );
};

export default ChatHeader;
