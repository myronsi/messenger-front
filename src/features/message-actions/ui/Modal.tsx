import React from 'react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { ModalState } from '@/entities/message';

interface ModalProps {
  modal: ModalState | null;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ modal, onClose }) => {
  const { translations } = useLanguage();
  if (!modal) return null;

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
