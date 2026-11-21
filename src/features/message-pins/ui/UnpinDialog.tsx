import { PinOff } from 'lucide-react';
import type { PinnedMessage, PinScope } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { unpinScopes } from '../model/pinRules';
import { PinChoiceDialog } from './PinChoiceDialog';

interface UnpinDialogProps {
  pin: PinnedMessage;
  direct: boolean;
  onUnpin: (scope: PinScope) => void;
  onCancel: () => void;
}

export const UnpinDialog = ({ pin, direct, onUnpin, onCancel }: UnpinDialogProps) => {
  const t = useLanguage().translations.messagePins;
  const choices = unpinScopes(pin).map((scope) => ({
    key: scope,
    label: scope === 'me' ? t.unpinForMe : direct ? t.unpinForBoth : t.unpinForEveryone,
    strong: scope === 'everyone',
    onSelect: () => onUnpin(scope),
  }));
  return <PinChoiceDialog icon={<PinOff />} title={t.unpinTitle} choices={choices} onCancel={onCancel} />;
};
