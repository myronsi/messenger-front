import React from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { useLanguage } from '@/contexts/LanguageContext';

interface ModalProps {
  modal: {
    type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ modal, onClose }) => {
  const { translations } = useLanguage();
  if (!modal) return null;

  const title =
    modal.type === 'deleteMessage'
      ? translations.deleteMessageConfirm
      : modal.type === 'deleteChat'
      ? translations.deleteChatConfirm
      : modal.type === 'copy'
      ? translations.success
      : translations.error;

  const confirmText = modal.type === 'copy' || modal.type === 'error' ? 'OK' : translations.confirm;

  return (
    <ConfirmModal
      title={title}
      message={modal.message}
      onConfirm={modal.onConfirm || onClose}
      onCancel={onClose}
      confirmText={confirmText}
      isError={modal.type === 'error'}
    />
  );
};

export default Modal;
