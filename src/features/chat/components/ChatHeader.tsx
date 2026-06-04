import React from 'react';
import { ArrowLeft } from 'lucide-react';
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
  interlocutorAvatar: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ chatName, chatDisplayName, isOnline, lastSeen, interlocutorDeleted, onBack, onDeleteChat, onOpenProfile, interlocutorAvatar }) => {
  const { translations } = useLanguage();
  const displayName = chatDisplayName || chatName;

  return (
    <div className="motion-panel-in px-4 py-3 sm:px-6 sm:py-4 border-b border-border flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="motion-press p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={!interlocutorDeleted ? onOpenProfile : undefined} className="motion-press flex min-w-0 items-center space-x-2 rounded-lg px-1 py-1">
          <img src={interlocutorAvatar} alt={displayName} className="motion-avatar w-9 h-9 rounded-full border border-gray-200 object-cover" />
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
    </div>
  );
};

export default ChatHeader;
