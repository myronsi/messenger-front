import React from 'react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import DeleteMessageChoiceModal from '@/shared/ui/DeleteMessageChoiceModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ModalProps {
  modal: {
    type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser' | 'deleteMessageChoice';
    message?: string;
    consequences?: string[];
    onConfirm?: () => void;
    isMessageSender?: boolean;
    messageId?: number;
    onDeleteForMe?: () => void | Promise<void>;
    onDeleteForAll?: () => void;
  } | null;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ modal, onClose }) => {
  const { translations } = useLanguage();
  if (!modal) return null;

  // Handle delete message choice modal
  if (modal.type === 'deleteMessageChoice') {
    return (
      <DeleteMessageChoiceModal
        isMessageSender={modal.isMessageSender || false}
        onDeleteForMe={modal.onDeleteForMe || onClose}
        onDeleteForAll={modal.onDeleteForAll || onClose}
        onCancel={onClose}
      />
    );
  }

  const title =
    modal.type === 'deleteMessage'
      ? translations.deleteMessageConfirm
      : modal.type === 'deleteChat'
      ? translations.deleteChatConfirmTitle || translations.deleteChatConfirm
      : modal.type === 'copy'
      ? translations.success
      : translations.error;

  const confirmText = modal.type === 'copy' || modal.type === 'error' ? 'OK' : translations.confirm;

  return (
    <ConfirmModal
      title={title}
      message={modal.message || ''}
      consequences={modal.consequences}
      onConfirm={modal.onConfirm || onClose}
      onCancel={onClose}
      confirmText={confirmText}
      isError={modal.type === 'error'}
      isDestructive={modal.type === 'deleteChat' || modal.type === 'deleteMessage'}
    />
  );
};

export default Modal;
