import { useState } from 'react';
import { PinOff } from 'lucide-react';
import type { PinnedMessage, PinScope } from '@/entities/message';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { unpinScopes } from '../model/pinRules';

interface UnpinDialogProps {
  pin: PinnedMessage;
  peerName?: string;
  onUnpin: (scope: PinScope) => void;
  onCancel: () => void;
}

export const UnpinDialog = ({ pin, peerName, onUnpin, onCancel }: UnpinDialogProps) => {
  const t = useLanguage().translations.messagePins;
  const [forEveryone, setForEveryone] = useState(true);
  const offersEveryone = unpinScopes(pin).includes('everyone');
  const option = !offersEveryone ? undefined : peerName !== undefined
    ? { label: fillTemplate(t.alsoUnpinFor, { name: peerName }), hint: t.unpinForBothHint }
    : { label: t.unpinForEveryone, hint: t.unpinForEveryoneHint };
  return (
    <ActionDialog tone="primary" icon={<PinOff />} title={t.unpinTitle} confirmText={t.unpin}
      points={offersEveryone ? undefined : [t.unpinStaysForOthers]}
      option={option && { ...option, checked: forEveryone, onChange: setForEveryone }}
      onCancel={onCancel} onConfirm={() => onUnpin(offersEveryone && forEveryone ? 'everyone' : 'me')} />
  );
};
