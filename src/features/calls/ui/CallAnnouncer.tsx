import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { Call } from '../api/callsApi';
import { useCallTitle } from './callHooks';

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

  useEffect(() => {
    if (!incoming || announced.current === incoming.id || !(title || caller)) return;
    announced.current = incoming.id;
    setUrgent(fillTemplate(translations.callAnnounceIncoming, { name: title || caller }));
  }, [caller, incoming, title, translations.callAnnounceIncoming]);

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
