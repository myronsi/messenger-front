import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatCallDuration } from '@/shared/lib/callDuration';
import type { Call } from '../api/callsApi';
import type { CallSession } from '../model/stores';
import { useNow } from './callHooks';

export const useCallStatus = (call: Call | null, session: CallSession) => {
  const { translations } = useLanguage();
  const now = useNow(true);
  const startedAt = call?.started_at ? Date.parse(call.started_at) : null;
  const phaseText = session.phase === 'rejoin' ? translations.callRejoinNeeded
    : session.phase === 'reconnecting' ? translations.callReconnecting
      : session.phase === 'connected' ? (startedAt ? translations.callConnected : translations.callRinging)
        : translations.callConnecting;
  const timer = session.phase === 'connected' && startedAt ? formatCallDuration((now - startedAt) / 1000) : null;
  const poorNetwork = session.phase === 'connected' && session.quality === 'poor';
  const warning = session.encryption === 'failed' || session.keyChanges.length > 0;
  return { phaseText, timer, poorNetwork, warning };
};
