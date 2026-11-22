import React from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ActionDialog } from '@/shared/ui/ActionDialog';

interface DeleteImageConfirmProps {
  busy: boolean;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteImageConfirm: React.FC<DeleteImageConfirmProps> = ({ busy, failed, onCancel, onConfirm }) => {
  const { translations } = useLanguage();
  return (
    <ActionDialog icon={<Trash2 />} title={translations.deletePhotoConfirm} confirmText={translations.delete}
      busy={busy} error={failed ? translations.photoDeleteFailed : null} onCancel={onCancel} onConfirm={onConfirm} />
  );
};
