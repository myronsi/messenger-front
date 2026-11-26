import React from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import type { Call, CallParticipant } from '../api/callsApi';
import { endCallForEveryone } from '../model/callController';
import type { CallSession } from '../model/stores';
import SecurityCodePanel from './SecurityCodePanel';
import { useUserName } from './callHooks';

interface CallMoreSheetProps {
  call: Call | null;
  session: CallSession;
  userId: string | null;
  allowedToEnd: boolean;
}

const ParticipantRow: React.FC<{ participant: CallParticipant; isMe: boolean }> = ({ participant, isMe }) => {
  const { translations } = useLanguage();
  const name = useUserName(participant.user_id);
  return (
    <li className="flex items-center justify-between gap-2 py-2 text-sm">
      <span className="truncate">{isMe ? translations.callYou : name || '…'}</span>
      <span className={participant.state === 'joined' ? 'text-success' : 'text-muted-foreground'}>
        {participant.state === 'joined' ? translations.callStateJoined : translations.callStateRinging}
      </span>
    </li>
  );
};

const CallMoreSheet: React.FC<CallMoreSheetProps> = ({ call, session, userId, allowedToEnd }) => {
  const { translations } = useLanguage();
  const visible = (call?.participants ?? []).filter((participant) => participant.state === 'joined' || participant.state === 'ringing');
  return (
    <div className="flex flex-col gap-4 pt-1">
      {visible.length > 0 && (
        <section>
          <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">{translations.callParticipants}</p>
          <ul aria-label={translations.callParticipantsCount.replace('{count}', String(visible.length))}
            className="divide-y divide-border rounded-xl border border-border px-3">
            {visible.map((participant) => (
              <ParticipantRow key={participant.user_id} participant={participant} isMe={participant.user_id === userId} />
            ))}
          </ul>
        </section>
      )}
      <SecurityCodePanel session={session} />
      {allowedToEnd && call?.kind === 'group' && (
        <Button variant="outline" className="w-full text-destructive" onClick={() => { void endCallForEveryone(); }}>
          {translations.callEndForEveryone}
        </Button>
      )}
    </div>
  );
};

export default CallMoreSheet;
