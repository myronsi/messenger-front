import React from 'react';
import { ArrowLeft, Image, MoreVertical, Search } from 'lucide-react';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { plainEmoji } from '@/shared/lib/customEmoji';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLongPress } from '@/shared/lib/useLongPress';
import type { GroupTranslations } from './groupChatTypes';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useGetGroupDetailsQuery } from '@/entities/chat';
import { ImportConfirmBanner, ImportStatusBanner, useChatImportMenu } from '@/features/chat-import';
import { useChatWallpaperAction } from '@/features/chat-wallpaper';
import { isGoApi } from '@/shared/api/goSocket';
import { CallButton, OngoingCallBanner } from '@/features/calls';
import { AudioPlayerBar } from '@/features/audio-player';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { participantCountLabel } from './groupChatUtils';

interface GroupChatHeaderProps {
  chatId?: EntityId;
  name: string;
  avatar: string;
  participantCount?: number;
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
  const { language, translations: appTranslations } = useLanguage();
  const persisted = chatId !== undefined && isPersistedId(chatId) ? chatId : undefined;
  const { data: details } = useGetGroupDetailsQuery(persisted ?? '', { skip: persisted === undefined });
  const role = details?.current_user_role;
  const importChat = { chatId: persisted ?? '', name, isGroup: true };
  const imports = useChatImportMenu({ chat: importChat, canImport: role === 'owner' || role === 'admin', canRemoveAll: role === 'owner' });
  const wallpaper = useChatWallpaperAction();
  const wallpaperChat = isGoApi() ? persisted : undefined;
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
            className="flex min-w-0 flex-1 items-center space-x-2 rounded-lg px-1 py-1 text-left outline-none motion-header-press hover:bg-accent/50 focus:outline-none active:bg-accent md:space-x-0"
          >
            <AuthenticatedImage src={avatar} alt={plainEmoji(name)} className="motion-avatar h-9 w-9 rounded-full border border-border object-cover md:hidden" />
            <span className="motion-header-text flex min-w-0 flex-col items-start">
              <span className="max-w-full truncate text-base font-semibold leading-tight sm:text-lg"><EmojiText text={name} /></span>
              <span className="max-w-full truncate text-xs font-normal text-muted-foreground">
                {participantCount === undefined ? String.fromCharCode(160) : participantCountLabel(participantCount, translations, language)}
                {participantCount !== undefined && description ? ` - ${description}` : ''}
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
          {(imports.items || wallpaperChat !== undefined) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={appTranslations.profileRework.more} title={appTranslations.profileRework.more}
                  className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {wallpaperChat !== undefined && (
                  <DropdownMenuItem onSelect={() => wallpaper.open({ chatId: String(wallpaperChat), direct: false })}>
                    <Image className="mr-2 h-4 w-4" />{appTranslations.appearance.wallpaper.menuItem}
                  </DropdownMenuItem>
                )}
                {imports.items}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <AudioPlayerBar />
      <OngoingCallBanner chatId={chatId} />
      {imports.dialogs}
      {wallpaper.dialog}
      {persisted !== undefined && <ImportStatusBanner chat={{ ...importChat, chatId: persisted }} />}
      {persisted !== undefined && <ImportConfirmBanner chat={{ ...importChat, chatId: persisted }} />}
    </>
  );
};

export default GroupChatHeader;
