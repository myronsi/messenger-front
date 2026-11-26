import { Ban, Eraser, Flag, Image, MoreVertical, Pin, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { EntityId } from '@/shared/api/entityId';
import { ReportUserDialog } from '@/features/moderation';
import { useChatActions, type ChatActionTarget } from '@/features/chat-cleanup';
import { openPinnedPanel, pinsEnabled } from '@/features/message-pins';
import { useChatImportMenu } from '@/features/chat-import';
import { useChatWallpaperAction } from '@/features/chat-wallpaper';
import { isGoApi } from '@/shared/api/goSocket';

interface ChatHeaderMenuProps {
  userId: EntityId;
  username: string;
  name: string;
  chatId?: EntityId;
  onChatDeleted?: () => void;
}

export const ChatHeaderMenu = ({ userId, username, name, chatId, onChatDeleted }: ChatHeaderMenuProps) => {
  const { translations } = useLanguage();
  const actions = useChatActions({ onDeleted: () => onChatDeleted?.() });
  const target: ChatActionTarget = { chatId, userId, username, name };
  const blocked = actions.isBlocked(username);
  const wallpaper = useChatWallpaperAction();
  const imports = useChatImportMenu({
    chat: { chatId: chatId ?? '', name, isGroup: false, peer: { id: userId, username, displayName: name } }, canImport: !blocked,
  });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={translations.profileRework.more} title={translations.profileRework.more}
            className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent">
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {chatId !== undefined && (
            <>
              {pinsEnabled(chatId) && (
                <DropdownMenuItem onSelect={() => openPinnedPanel(chatId)}>
                  <Pin className="mr-2 h-4 w-4" />{translations.messagePins.pinnedMessages}
                </DropdownMenuItem>
              )}
              {imports.items}
              {isGoApi() && (
                <DropdownMenuItem onSelect={() => wallpaper.open({ chatId: String(chatId), peerName: name, direct: true, blocked })}>
                  <Image className="mr-2 h-4 w-4" />{translations.appearance.wallpaper.menuItem}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => actions.openClear(target)}>
                <Eraser className="mr-2 h-4 w-4" />{translations.chatCleanup.clearHistory}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => actions.openDelete(target)}>
                <Trash2 className="mr-2 h-4 w-4" />{translations.chatCleanup.deleteChat}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem className={blocked ? undefined : 'text-destructive focus:text-destructive'} onSelect={() => actions.openBlock(target)}>
            <Ban className="mr-2 h-4 w-4" />{blocked ? translations.blockUser.unblock : translations.blockUser.block}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void actions.openReport(target)}>
            <Flag className="mr-2 h-4 w-4" />{translations.moderation.report}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {actions.dialogs}
      {imports.dialogs}
      {wallpaper.dialog}
      {actions.reporting && <ReportUserDialog userId={actions.reporting.userId} name={actions.reporting.name} onClose={actions.closeReport} />}
    </>
  );
};
