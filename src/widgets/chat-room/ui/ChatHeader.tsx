import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { getPresenceLabel } from '@/shared/utils/presenceFormatters';

interface ChatHeaderProps {
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
  chatName, chatDisplayName, isOnline, lastSeen, interlocutorDeleted, onBack, onOpenProfile,
  onOpenSearch, interlocutorAvatar,
}) => {
  const { translations } = useLanguage();
  const displayName = chatDisplayName || chatName;

  return (
    <div className="motion-panel-in h-[72px] shrink-0 px-4 sm:px-6 border-b border-border flex justify-between items-center">
      <div className="flex min-w-0 items-center space-x-4 md:space-x-0">
        <button onClick={onBack} aria-label={translations.back || 'Back'} className="motion-press p-2 hover:bg-accent rounded-full transition-colors md:hidden">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={!interlocutorDeleted ? onOpenProfile : undefined} className="motion-press flex min-w-0 items-center space-x-2 rounded-lg px-1 py-1 md:space-x-0">
          <AuthenticatedImage src={interlocutorAvatar} alt={displayName} className="motion-avatar w-9 h-9 rounded-full border border-gray-200 object-cover md:hidden" />
          <span className="flex min-w-0 flex-col items-start">
            <span className="max-w-[52vw] truncate text-base font-semibold leading-tight sm:max-w-none sm:text-lg">{interlocutorDeleted ? translations.deletedUser || 'Deleted User' : displayName}</span>
            {!interlocutorDeleted && (
              <span className="text-xs font-normal text-muted-foreground">
                {getPresenceLabel(isOnline, lastSeen)}
              </span>
            )}
          </span>
        </button>
      </div>
      {onOpenSearch && (
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={translations.search || 'Search'}
          title={translations.search || 'Search'}
          className="motion-press shrink-0 rounded-full p-2 transition-colors hover:bg-accent"
        >
          <Search className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default ChatHeader;
