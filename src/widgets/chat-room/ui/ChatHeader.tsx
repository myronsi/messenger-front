import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { usePresenceLabel } from '@/shared/utils/presenceFormatters';
import { useLongPress } from '@/shared/lib/useLongPress';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { CallButton, OngoingCallBanner } from '@/features/calls';
import { AudioPlayerBar } from '@/features/audio-player';
import { useGetCurrentUserQuery } from '@/features/profile';
import { selfName } from '@/shared/lib/selfName';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { useGetUserByUsernameQuery } from '@/entities/user';
import { RestrictedAccountLabel } from '@/features/moderation';
import { ChatHeaderMenu } from './ChatHeaderMenu';
import { ImportConfirmBanner, ImportStatusBanner } from '@/features/chat-import';

interface ChatHeaderProps {
  chatId?: EntityId;
  chatName: string;
  chatDisplayName?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  interlocutorDeleted: boolean;
  onBack: () => void;
  onChatDeleted: () => void;
  onOpenProfile: () => void;
  onOpenSearch?: () => void;
  interlocutorAvatar: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatId, chatName, chatDisplayName, isOnline, lastSeen, interlocutorDeleted, onBack, onChatDeleted, onOpenProfile,
  onOpenSearch, interlocutorAvatar,
}) => {
  const { translations } = useLanguage();
  const presenceLabel = usePresenceLabel(isOnline, lastSeen);
  const shortPresence = usePresenceLabel(isOnline, lastSeen, true);
  const { data: me } = useGetCurrentUserQuery();
  const saved = !!me?.username && me.username.toLowerCase() === chatName.toLowerCase();
  const displayName = saved ? selfName(chatDisplayName || chatName, translations) : chatDisplayName || chatName;
  const longPress = useLongPress(onOpenSearch);
  const { data: peer } = useGetUserByUsernameQuery(chatName, { skip: saved || interlocutorDeleted || !chatName });
  const isMobile = useIsMobile();
  const persistedChatId = chatId !== undefined && isPersistedId(chatId) ? chatId : undefined;

  return (
    <>
      <div data-testid="chat-header" {...longPress.handlers} className="motion-panel-in h-[72px] shrink-0 pl-1.5 pr-3 sm:px-6 border-b border-border flex justify-between items-center">
        <div className="flex min-w-0 flex-1 items-center space-x-1 md:space-x-0">
          <button onClick={onBack} aria-label={translations.back || 'Back'} className="motion-press flex h-11 w-11 shrink-0 items-center justify-center hover:bg-accent rounded-full transition-colors md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={() => { if (!longPress.consumeClick() && !interlocutorDeleted) onOpenProfile(); }} className="flex min-w-0 flex-1 items-center space-x-2 rounded-lg px-1 py-1 text-left motion-header-press hover:bg-accent/50 active:bg-accent md:space-x-0">
            <AuthenticatedImage src={interlocutorAvatar} alt={displayName} className="motion-avatar w-9 h-9 rounded-full border border-border object-cover md:hidden" />
            <span className="motion-header-text flex min-w-0 flex-col items-start">
              <span className="flex max-w-full items-center gap-2">
                <span className="truncate text-base font-semibold leading-tight sm:text-lg">{interlocutorDeleted ? translations.deletedUser || 'Deleted User' : <EmojiText text={displayName} />}</span>
                {!interlocutorDeleted && !saved && <RestrictedAccountLabel label={peer?.account_label} className="shrink-0" />}
              </span>
              {!interlocutorDeleted && !saved && (
                <span data-testid="chat-header-presence" title={presenceLabel}
                  className="max-w-full truncate text-xs font-normal leading-tight text-muted-foreground">
                  <span className="md:hidden">{shortPresence}</span>
                  <span className="max-md:hidden">{presenceLabel}</span>
                </span>
              )}
            </span>
          </button>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {!interlocutorDeleted && !saved && <CallButton chatId={chatId} />}
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
          {!isMobile && !interlocutorDeleted && !saved && peer?.id && (
            <ChatHeaderMenu userId={peer.id} username={chatName} name={displayName} chatId={persistedChatId} onChatDeleted={onChatDeleted} />
          )}
        </div>
      </div>
      <AudioPlayerBar />
      {!interlocutorDeleted && <OngoingCallBanner chatId={chatId} />}
      {persistedChatId !== undefined && peer?.id && <ImportStatusBanner
        chat={{ chatId: persistedChatId, name: displayName, isGroup: false, peer: { id: peer.id, username: chatName, displayName } }} />}
      {persistedChatId !== undefined && peer?.id && <ImportConfirmBanner
        chat={{ chatId: persistedChatId, name: displayName, isGroup: false, peer: { id: peer.id, username: chatName, displayName } }} />}
    </>
  );
};

export default ChatHeader;
