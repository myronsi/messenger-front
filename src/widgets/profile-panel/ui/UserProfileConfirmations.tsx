import React, { useState } from 'react';
import { fillTemplate } from '@/shared/lib/fillTemplate';
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
  onConfirmDeleteChat: (scope: 'me' | 'everyone') => void;
}

const UserProfileConfirmations: React.FC<UserProfileConfirmationsProps> = ({
  isBlockConfirmOpen, isDeleteChatConfirmOpen, displayName, blockConsequences, deleteConsequences,
  onCancelBlock, onConfirmBlock, onCancelDeleteChat, onConfirmDeleteChat,
}) => {
  const { translations } = useLanguage();
  const [alsoForPeer, setAlsoForPeer] = useState(false);
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
          checkbox={{ label: fillTemplate(translations.chatCleanup.alsoDeleteFor, { name: displayName }), checked: alsoForPeer, onChange: setAlsoForPeer }}
          onCancel={() => { setAlsoForPeer(false); onCancelDeleteChat(); }}
          onConfirm={() => { onConfirmDeleteChat(alsoForPeer ? 'everyone' : 'me'); setAlsoForPeer(false); }}
        />
      )}
    </>
  );
};

export default UserProfileConfirmations;
