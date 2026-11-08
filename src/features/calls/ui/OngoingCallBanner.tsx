import React, { useEffect } from 'react';
import { PhoneCall } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { browserSupportsCallEncryption, isNativeShell, useCallsEnabledOnServer } from '../model/availability';
import { joinCall } from '../model/callController';
import { activeCallForChat, joinedParticipants } from '../model/callState';
import { refreshChatCall } from '../model/callSync';
import { useCallSession, useCallsState } from './callHooks';

interface OngoingCallBannerProps {
  chatId?: string | number | null;
}

const OngoingCallBanner: React.FC<OngoingCallBannerProps> = ({ chatId }) => {
  const { translations } = useLanguage();
  const enabled = useCallsEnabledOnServer();
  const calls = useCallsState();
  const session = useCallSession();
  const id = chatId == null ? '' : String(chatId);
  const persisted = /^[1-9]\d*$/.test(id);
  const hidden = isNativeShell();

  useEffect(() => {
    if (enabled && persisted && !hidden) void refreshChatCall(id);
  }, [enabled, hidden, id, persisted]);

  const call = enabled && persisted && !hidden ? activeCallForChat(calls, id) : null;
  if (!call || session.callId === call.id) return null;
  const supported = browserSupportsCallEncryption();
  const count = joinedParticipants(call).length;
  const blocked = !!session.callId || session.otherTab;
  return (
    <div role="status" className="flex shrink-0 items-center gap-3 border-b border-border bg-success-soft px-4 py-2 text-sm text-success sm:px-6">
      <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">
        {call.kind === 'group' ? translations.callOngoingGroup : translations.callOngoing}
        {count > 0 ? ` · ${fillTemplate(translations.callInCallCount, { count: String(count) })}` : ''}
        {!supported ? ` · ${translations.callUnsupported}` : session.otherTab ? ` · ${translations.callInOtherTab}` : ''}
      </span>
      {supported && (
        <Button size="sm" onClick={() => { void joinCall(call.id); }} disabled={blocked}>
          {translations.callJoin}
        </Button>
      )}
    </div>
  );
};

export default OngoingCallBanner;
