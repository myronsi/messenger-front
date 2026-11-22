import { useState } from 'react';
import { Pin } from 'lucide-react';
import type { PinScope } from '@/entities/message';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { pinScopes, type PinChatContext } from '../model/pinRules';

interface PinScopeDialogProps {
  context: PinChatContext;
  onPin: (scope: PinScope) => void;
  onCancel: () => void;
}

export const PinScopeDialog = ({ context, onPin, onCancel }: PinScopeDialogProps) => {
  const t = useLanguage().translations.messagePins;
  const [forEveryone, setForEveryone] = useState(true);
  const offersEveryone = pinScopes(context).includes('everyone');
  const option = !offersEveryone ? undefined : context.kind === 'direct'
    ? { label: fillTemplate(t.alsoPinFor, { name: context.peerName }), hint: t.pinForBothHint }
    : { label: t.pinForEveryone, hint: t.pinForEveryoneHint };
  return (
    <ActionDialog tone="primary" icon={<Pin />} title={t.pinTitle} confirmText={t.pin}
      option={option && { ...option, checked: forEveryone, onChange: setForEveryone }}
      onCancel={onCancel} onConfirm={() => onPin(offersEveryone && forEveryone ? 'everyone' : 'me')} />
  );
};
