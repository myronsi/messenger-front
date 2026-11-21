import { Pin } from 'lucide-react';
import type { PinScope } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { pinScopes, type PinChatContext } from '../model/pinRules';
import { PinChoiceDialog } from './PinChoiceDialog';

interface PinScopeDialogProps {
  context: PinChatContext;
  onPin: (scope: PinScope) => void;
  onCancel: () => void;
}

export const PinScopeDialog = ({ context, onPin, onCancel }: PinScopeDialogProps) => {
  const t = useLanguage().translations.messagePins;
  const everyone = context.kind === 'direct' ? fillTemplate(t.pinForBoth, { name: context.peerName }) : t.pinForEveryone;
  const choices = pinScopes(context).map((scope) => ({
    key: scope,
    label: scope === 'me' ? t.pinForMe : everyone,
    strong: scope === 'everyone',
    onSelect: () => onPin(scope),
  }));
  return <PinChoiceDialog icon={<Pin />} title={t.pinTitle} choices={choices} onCancel={onCancel} />;
};
