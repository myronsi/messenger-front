import React from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { ProfileSearchPanel } from './ProfileChatPanels';

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: EntityId;
  onJumpToMessage: (messageId: EntityId) => void;
}

const ChatSearchDialog: React.FC<ChatSearchDialogProps> = ({ open, onOpenChange, chatId, onJumpToMessage }) => {
  const { translations } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{translations.searchMessages || 'Search messages'}</DialogTitle>
        {open && (
          <ProfileSearchPanel
            chatId={chatId}
            onJumpToMessage={(messageId) => {
              onOpenChange(false);
              onJumpToMessage(messageId);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatSearchDialog;
