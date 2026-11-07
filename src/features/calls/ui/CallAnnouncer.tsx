import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { Call } from '../api/callsApi';
import { useCallTitle } from './callHooks';

const ANNOUNCE_DELAY_MS = 150;

interface CallAnnouncerProps {
  incoming: Call | null;
  inCall: boolean;
  userId: string | null;
}

const CallAnnouncer: React.FC<CallAnnouncerProps> = ({ incoming, inCall, userId }) => {
  const { translations } = useLanguage();
  const { title, caller } = useCallTitle(incoming, userId);
  const [urgent, setUrgent] = useState('');
  const [polite, setPolite] = useState('');
  const announced = useRef<string | null>(null);
  const wasInCall = useRef(inCall);

  const incomingId = incoming?.id ?? null;
  const name = title || caller;

  useEffect(() => {
    if (!incomingId) {
      announced.current = null;
      setUrgent('');
      return undefined;
    }
    if (announced.current === incomingId || !name) return undefined;
    setUrgent('');
    const timer = window.setTimeout(() => {
      announced.current = incomingId;
      setUrgent(fillTemplate(translations.callAnnounceIncoming, { name }));
    }, ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [incomingId, name, translations.callAnnounceIncoming]);

  useEffect(() => {
    if (wasInCall.current && !inCall) setPolite(translations.callAnnounceEnded);
    else if (inCall) setPolite('');
    wasInCall.current = inCall;
  }, [inCall, translations.callAnnounceEnded]);

  return (
    <div className="sr-only">
      <p aria-live="assertive" aria-atomic="true">{urgent}</p>
      <p aria-live="polite" aria-atomic="true">{polite}</p>
    </div>
  );
};

export default CallAnnouncer;
