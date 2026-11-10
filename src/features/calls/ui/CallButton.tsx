import React from 'react';
import { Phone } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useCallsAvailable } from '../model/availability';
import { startCall } from '../model/callController';
import { useCallSession } from './callHooks';

interface CallButtonProps {
  chatId?: string | number | null;
  disabled?: boolean;
}

const persistedChatId = (chatId: CallButtonProps['chatId']) => {
  const value = chatId == null ? '' : String(chatId);
  return /^[1-9]\d*$/.test(value) ? value : null;
};

const CallButton: React.FC<CallButtonProps> = ({ chatId, disabled = false }) => {
  const { translations } = useLanguage();
  const available = useCallsAvailable();
  const session = useCallSession();
  const id = persistedChatId(chatId);
  if (!available || !id) return null;
  const busy = !!session.callId || session.otherTab;
  const label = session.otherTab ? translations.callInOtherTab : translations.callStart;
  return (
    <button
      type="button"
      onClick={() => { void startCall(id); }}
      disabled={disabled || busy}
      aria-label={label}
      title={label}
      className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Phone className="h-5 w-5" />
    </button>
  );
};

export default CallButton;
