import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useChatActions } from '@/features/chat-cleanup';

interface DeletedChatFooterProps {
  chatId: EntityId;
  chatName: string;
  onDeleted: () => void;
}

export const DeletedChatFooter = ({ chatId, chatName, onDeleted }: DeletedChatFooterProps) => {
  const { translations } = useLanguage();
  const actions = useChatActions({ onDeleted });
  return (
    <div className="p-4 border-t border-border">
      <button onClick={() => actions.openDelete({ chatId, username: chatName, name: translations.deletedUser || chatName })}
        className="w-full p-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
        {translations.chatCleanup.deleteChat}
      </button>
      {actions.dialogs}
    </div>
  );
};
