import React from 'react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface UserProfileConfirmationsProps {
  isBlockConfirmOpen: boolean;
  isDeleteChatConfirmOpen: boolean;
  displayName: string;
  blockConsequences: string[];
  deleteConsequences: string[];
  onCancelBlock: () => void;
  onConfirmBlock: () => void;
  onCancelDeleteChat: () => void;
  onConfirmDeleteChat: () => void;
}

const UserProfileConfirmations: React.FC<UserProfileConfirmationsProps> = ({
  isBlockConfirmOpen, isDeleteChatConfirmOpen, displayName, blockConsequences, deleteConsequences,
  onCancelBlock, onConfirmBlock, onCancelDeleteChat, onConfirmDeleteChat,
}) => {
  const { translations } = useLanguage();
  return (
    <>
      {isBlockConfirmOpen && (
        <ConfirmModal
          title={translations.blockUserConfirmTitle || `Block ${displayName}?`}
          message={translations.blockUserConfirmMessage || 'After blocking this user, the following consequences will apply:'}
          consequences={blockConsequences}
          confirmText={translations.block || 'Block'}
          cancelText={translations.cancel || 'Cancel'}
          isDestructive
          onCancel={onCancelBlock}
          onConfirm={onConfirmBlock}
        />
      )}
      {isDeleteChatConfirmOpen && (
        <ConfirmModal
          title={translations.deleteChatConfirmTitle || 'Delete this chat?'}
          message={translations.deleteChatConfirmMessage || 'After deleting this chat, the following consequences will apply:'}
          consequences={deleteConsequences}
          confirmText={translations.deleteChat || 'Delete Chat'}
          cancelText={translations.cancel || 'Cancel'}
          isDestructive
          onCancel={onCancelDeleteChat}
          onConfirm={onConfirmDeleteChat}
        />
      )}
    </>
  );
};

export default UserProfileConfirmations;
