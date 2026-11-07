import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatCountdown, secondsUntil } from '@/shared/lib/countdown';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import type { Call } from '../api/callsApi';
import { browserSupportsCallEncryption } from '../model/availability';
import { declineCall, joinCall } from '../model/callController';
import { joinedParticipants } from '../model/callState';
import { useCallSession, useCallTitle, useNow } from './callHooks';
import { useRingtone } from './useRingtone';

interface IncomingCallCardProps {
  call: Call;
  userId: string | null;
}

const IncomingCallCard: React.FC<IncomingCallCardProps> = ({ call, userId }) => {
  const { translations } = useLanguage();
  const session = useCallSession();
  const now = useNow();
  const { title, caller } = useCallTitle(call, userId);
  const acceptRef = useRef<HTMLButtonElement>(null);
  const supported = browserSupportsCallEncryption();
  const busy = !!session.callId || session.otherTab;
  const remaining = secondsUntil(Date.parse(call.ring_expires_at), now);
  const joined = joinedParticipants(call).length;
  useRingtone(remaining > 0);

  useEffect(() => { acceptRef.current?.focus(); }, [call.id]);

  if (remaining <= 0) return null;
  const heading = call.kind === 'group' ? translations.callIncomingGroup : translations.callIncoming;
  return (
    <div
      role="alertdialog"
      aria-labelledby={`incoming-call-${call.id}`}
      aria-describedby={`incoming-call-${call.id}-details`}
      className="motion-sheet-in pointer-events-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-background p-4 shadow-2xl"
      onKeyDown={(event) => { if (event.key === 'Escape') void declineCall(call.id); }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{heading}</p>
      <h2 id={`incoming-call-${call.id}`} className="mt-1 truncate text-lg font-semibold">{title || caller || heading}</h2>
      <div id={`incoming-call-${call.id}-details`} className="mt-1 space-y-0.5 text-sm text-muted-foreground">
        {call.kind === 'group' && caller && <p className="truncate">{caller}</p>}
        {call.kind === 'group' && <p>{fillTemplate(translations.callInCallCount, { count: String(joined) })}</p>}
        <p aria-live="off">{fillTemplate(translations.callRingsFor, { time: formatCountdown(remaining) })}</p>
        {!supported && <p className="text-destructive">{translations.callUnsupported}</p>}
        {supported && session.otherTab && <p>{translations.callInOtherTab}</p>}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="destructive" className="flex-1" onClick={() => { void declineCall(call.id); }}>
          <PhoneOff aria-hidden="true" />
          {translations.callDecline}
        </Button>
        {supported && (
          <Button ref={acceptRef} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => { void joinCall(call.id); }}>
            <Phone aria-hidden="true" />
            {translations.callAccept}
          </Button>
        )}
      </div>
    </div>
  );
};

export default IncomingCallCard;
