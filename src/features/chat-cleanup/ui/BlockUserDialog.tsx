import { useState } from 'react';
import { Ban } from 'lucide-react';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';

interface BlockUserDialogProps {
  name: string;
  canDeleteChat: boolean;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (deleteChat: boolean) => void;
}

export const BlockUserDialog = ({ name, canDeleteChat, busy, error, onCancel, onConfirm }: BlockUserDialogProps) => {
  const t = useLanguage().translations.blockUser;
  const [deleteChat, setDeleteChat] = useState(false);
  const values = { name };
  return (
    <ActionDialog
      icon={<Ban />}
      title={fillTemplate(t.title, values)}
      points={t.points.map((point) => fillTemplate(point, values))}
      option={canDeleteChat ? { label: t.alsoDelete, hint: t.alsoDeleteHint, checked: deleteChat, onChange: setDeleteChat } : undefined}
      confirmText={t.block}
      busy={busy}
      error={error}
      onCancel={onCancel}
      onConfirm={() => onConfirm(canDeleteChat && deleteChat)}
    />
  );
};
