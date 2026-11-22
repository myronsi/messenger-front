import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';

export interface DeleteForEveryoneOffer {
  direct: boolean;
  peerName?: string;
}

interface DeleteMessagesDialogProps {
  count: number;
  everyone: DeleteForEveryoneOffer | null;
  busy?: boolean;
  error?: string | null;
  onConfirm: (forEveryone: boolean) => void;
  onCancel: () => void;
}

export const DeleteMessagesDialog = ({ count, everyone, busy, error, onConfirm, onCancel }: DeleteMessagesDialogProps) => {
  const { translations: t } = useLanguage();
  const [forEveryone, setForEveryone] = useState(false);
  const title = count === 1 ? t.deleteMessageConfirm : fillTemplate(t.deleteMessagesConfirm, { count: String(count) });
  const option = !everyone ? undefined : everyone.direct
    ? { label: everyone.peerName ? fillTemplate(t.alsoDeleteMessageFor, { name: everyone.peerName }) : t.deleteForBoth, hint: t.deleteMessageForBothHint }
    : { label: t.deleteForEveryone, hint: t.deleteMessageForEveryoneHint };
  return (
    <ActionDialog icon={<Trash2 />} title={title} confirmText={t.deleteMessage} busy={busy} error={error}
      option={option && { ...option, checked: forEveryone, onChange: setForEveryone }}
      onCancel={onCancel} onConfirm={() => onConfirm(!!everyone && forEveryone)} />
  );
};
