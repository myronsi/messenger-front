import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Mic, MicOff, PhoneOff, Volume2, WifiOff } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatCallDuration } from '@/shared/lib/callDuration';
import { Button } from '@/shared/ui/button';
import type { Call, CallParticipant } from '../api/callsApi';
import { endCallForEveryone, leaveCall, rejoinCall } from '../model/callController';
import { enableCallAudio, selectInputDevice, selectOutputDevice, toggleMute } from '../model/callControls';
import { canEndForEveryone } from '../model/permissions';
import type { CallSession } from '../model/stores';
import CallWarnings from './CallWarnings';
import DeviceSelect from './DeviceSelect';
import SecurityCodePanel from './SecurityCodePanel';
import { useCallTitle, useGroupInfo, useNow, useUserName } from './callHooks';

interface ActiveCallPanelProps {
  call: Call | null;
  session: CallSession;
  userId: string | null;
}

const ParticipantRow: React.FC<{ participant: CallParticipant; isMe: boolean }> = ({ participant, isMe }) => {
  const { translations } = useLanguage();
  const name = useUserName(participant.user_id);
  return (
    <li className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="truncate">{isMe ? translations.callYou : name || '…'}</span>
      <span className={participant.state === 'joined' ? 'text-emerald-700' : 'text-muted-foreground'}>
        {participant.state === 'joined' ? translations.callStateJoined : translations.callStateRinging}
      </span>
    </li>
  );
};

const ActiveCallPanel: React.FC<ActiveCallPanelProps> = ({ call, session, userId }) => {
  const { translations } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const now = useNow(true);
  const { title } = useCallTitle(call, userId);
  const group = useGroupInfo(call);
  const startedAt = call?.started_at ? Date.parse(call.started_at) : null;
  const visible = (call?.participants ?? []).filter((participant) => participant.state === 'joined' || participant.state === 'ringing');
  const allowedToEnd = !!call && canEndForEveryone(call, userId, group.role);
  const phaseText = session.phase === 'rejoin' ? translations.callRejoinNeeded
    : session.phase === 'reconnecting' ? translations.callReconnecting
      : session.phase === 'connected' ? (startedAt ? translations.callConnected : translations.callRinging)
        : translations.callConnecting;
  const timer = session.phase === 'connected' && startedAt ? formatCallDuration((now - startedAt) / 1000) : null;
  const poorNetwork = session.phase === 'connected' && session.quality === 'poor';

  return (
    <section
      aria-label={translations.callPanelTitle}
      className="pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{title || translations.callPanelTitle}</h2>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {poorNetwork && <WifiOff className="h-3 w-3" aria-hidden="true" />}
            {timer && <span>{timer}</span>}
            <span aria-live="polite" className="flex items-center gap-1">
              <span className={timer ? 'sr-only' : undefined}>{phaseText}</span>
              {poorNetwork && <span>· {translations.callPoorNetwork}</span>}
            </span>
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-expanded={expanded} aria-label={expanded ? translations.callMinimize : translations.callExpand}
          onClick={() => setExpanded((value) => !value)}>
          {expanded ? <ChevronDown /> : <ChevronUp />}
        </Button>
      </header>
      <CallWarnings session={session} />
      {expanded && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {session.encryption !== 'failed' && (
            <p className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {session.encryption === 'ready' ? translations.callEncrypted : translations.callEncryptionPending}
            </p>
          )}
          <ul aria-label={translations.callParticipantsCount.replace('{count}', String(visible.length))} className="divide-y divide-border">
            {visible.map((participant) => (
              <ParticipantRow key={participant.user_id} participant={participant} isMe={participant.user_id === userId} />
            ))}
          </ul>
          {session.audioBlocked && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              <span className="flex-1">{translations.callAudioBlocked}</span>
              <Button size="sm" onClick={() => { void enableCallAudio(); }}><Volume2 aria-hidden="true" />{translations.callEnableAudio}</Button>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <DeviceSelect id="call-input-device" label={translations.callMicrophone} defaultLabel={translations.callDefaultDevice}
              value={session.input} options={session.inputs} onChange={(id) => { void selectInputDevice(id); }} />
            {session.outputSupported && (
              <DeviceSelect id="call-output-device" label={translations.callAudioOutput} defaultLabel={translations.callDefaultDevice}
                value={session.output} options={session.outputs} onChange={(id) => { void selectOutputDevice(id); }} />
            )}
          </div>
          <Button variant="outline" size="sm" aria-expanded={showCode} onClick={() => setShowCode((value) => !value)}>
            {showCode ? translations.callHideSecurityCode : translations.callShowSecurityCode}
          </Button>
          {showCode && <SecurityCodePanel session={session} />}
        </div>
      )}
      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        {session.phase === 'rejoin' ? (
          <Button onClick={() => { void rejoinCall(); }}>{translations.callRejoin}</Button>
        ) : (
          <Button variant={session.muted ? 'secondary' : 'outline'} size="icon" aria-pressed={session.muted}
            aria-label={translations.callMute} title={translations.callMute}
            onClick={() => { void toggleMute(); }}>
            {session.muted ? <MicOff /> : <Mic />}
          </Button>
        )}
        <Button variant="destructive" className="flex-1" onClick={() => { void leaveCall(); }}>
          <PhoneOff aria-hidden="true" />
          {translations.callLeave}
        </Button>
        {allowedToEnd && call?.kind === 'group' && (
          <Button variant="outline" onClick={() => { void endCallForEveryone(); }}>{translations.callEndForEveryone}</Button>
        )}
      </footer>
    </section>
  );
};

export default ActiveCallPanel;
