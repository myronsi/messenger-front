import { useState } from 'react';
import { Eraser, Flag, MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { EntityId } from '@/shared/api/entityId';
import { toast } from '@/shared/ui/sonner';
import { ReportUserDialog } from '@/features/moderation';
import { ChatCleanupDialog, useChatCleanup } from '@/features/chat-cleanup';

interface ChatHeaderMenuProps {
  userId: EntityId;
  name: string;
  chatId?: EntityId;
  onDeleteChat?: () => void;
}

export const ChatHeaderMenu = ({ userId, name, chatId, onDeleteChat }: ChatHeaderMenuProps) => {
  const { translations } = useLanguage();
  const [reportOpen, setReportOpen] = useState(false);
  const cleanup = useChatCleanup(() => toast(translations.chatCleanup.cleared), (message) => toast(message || translations.errorLoading));
  const clearChat = () => chatId !== undefined && cleanup.open({
    kind: 'clear', target: { chatId, name, isGroup: false, isSaved: false, canClearForEveryone: true },
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
            <DropdownMenuItem onSelect={clearChat}>
              <Eraser className="mr-2 h-4 w-4" />{translations.chatCleanup.clearHistory}
            </DropdownMenuItem>
          )}
          {onDeleteChat && (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDeleteChat}>
              <Trash2 className="mr-2 h-4 w-4" />{translations.chatCleanup.deleteChat}
            </DropdownMenuItem>
          )}
          {(chatId !== undefined || onDeleteChat) && <DropdownMenuSeparator />}
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" />{translations.moderation.report}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {reportOpen && <ReportUserDialog userId={userId} name={name} onClose={() => setReportOpen(false)} />}
      <ChatCleanupDialog request={cleanup.request} onCancel={cleanup.close} onConfirm={(forEveryone) => void cleanup.confirm(forEveryone)} />
    </>
  );
};
