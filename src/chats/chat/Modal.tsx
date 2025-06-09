import React from 'react';
import ConfirmModal from '@/components/ConfirmModal';

interface ModalProps {
  modal: {
    type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
    message: string;
    onConfirm?: () => void;
  } | null;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ modal, onClose }) => {
  if (!modal) return null;

  const title =
    modal.type === 'deleteMessage'
      ? 'Delete Message'
      : modal.type === 'deleteChat'
      ? 'Delete Chat'
      : modal.type === 'copy'
      ? 'Success'
      : 'Error';

  const confirmText = modal.type === 'copy' || modal.type === 'error' ? 'OK' : 'Confirm';

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
