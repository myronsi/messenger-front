import React, { useState } from 'react';
import { Lock, Mic, MicOff, Minimize2, PhoneOff, Volume2, WifiOff } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { Button } from '@/shared/ui/button';
import type { Call, CallParticipant } from '../api/callsApi';
import { endCallForEveryone, leaveCall, rejoinCall } from '../model/callController';
import { enableCallAudio, selectInputDevice, selectOutputDevice, toggleMute } from '../model/callControls';
import { minimizeCall } from '../model/callView';
import { canEndForEveryone } from '../model/permissions';
import type { CallSession } from '../model/stores';
import CallWarnings from './CallWarnings';
import DeviceSelect from './DeviceSelect';
import SecurityCodePanel from './SecurityCodePanel';
import { useCallAvatar, useCallTitle, useGroupInfo, useUserName } from './callHooks';
import { useCallStatus } from './useCallStatus';

interface ActiveCallPanelProps {
  call: Call | null;
  session: CallSession;
  userId: string | null;
}

const ParticipantRow: React.FC<{ participant: CallParticipant; isMe: boolean }> = ({ participant, isMe }) => {
  const { translations } = useLanguage();
  const name = useUserName(participant.user_id);
  return (
    <li className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="truncate">{isMe ? translations.callYou : name || '…'}</span>
      <span className={participant.state === 'joined' ? 'text-emerald-700' : 'text-muted-foreground'}>
        {participant.state === 'joined' ? translations.callStateJoined : translations.callStateRinging}
      </span>
    </li>
  );
};

const ActiveCallPanel: React.FC<ActiveCallPanelProps> = ({ call, session, userId }) => {
  const { translations } = useLanguage();
  const [showCode, setShowCode] = useState(false);
  const { title } = useCallTitle(call, userId);
  const avatar = useCallAvatar(call, userId);
  const group = useGroupInfo(call);
  const { phaseText, timer, poorNetwork } = useCallStatus(call, session);
  const visible = (call?.participants ?? []).filter((participant) => participant.state === 'joined' || participant.state === 'ringing');
  const allowedToEnd = !!call && canEndForEveryone(call, userId, group.role);
  const name = title || translations.callPanelTitle;

  return (
    <section aria-label={translations.callPanelTitle} className="flex h-full w-full flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="flex items-center gap-2 border-b border-border bg-background px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate font-semibold">{translations.callPanelTitle}</h2>
        <Button variant="ghost" size="icon" aria-label={translations.callMinimize} title={translations.callMinimize} onClick={minimizeCall}>
          <Minimize2 />
        </Button>
      </header>
      <CallWarnings session={session} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-8">
          <AuthenticatedImage src={avatar} initialsFrom={name} alt="" loading="eager"
            className="h-28 w-28 rounded-full border border-border object-cover shadow-md" />
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="max-w-full truncate text-2xl font-semibold">{name}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              {poorNetwork && <WifiOff className="h-4 w-4" aria-hidden="true" />}
              {timer && <span className="tabular-nums">{timer}</span>}
              <span aria-live="polite" className="flex items-center gap-1">
                <span className={timer ? 'sr-only' : undefined}>{phaseText}</span>
                {poorNetwork && <span>· {translations.callPoorNetwork}</span>}
              </span>
            </p>
          </div>
          {session.encryption !== 'failed' && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {session.encryption === 'ready' ? translations.callEncrypted : translations.callEncryptionPending}
            </p>
          )}
          <ul aria-label={translations.callParticipantsCount.replace('{count}', String(visible.length))}
            className="w-full divide-y divide-border rounded-xl border border-border bg-background px-4">
            {visible.map((participant) => (
              <ParticipantRow key={participant.user_id} participant={participant} isMe={participant.user_id === userId} />
            ))}
          </ul>
          {session.audioBlocked && (
            <div className="flex w-full items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              <span className="flex-1">{translations.callAudioBlocked}</span>
              <Button size="sm" onClick={() => { void enableCallAudio(); }}><Volume2 aria-hidden="true" />{translations.callEnableAudio}</Button>
            </div>
          )}
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <DeviceSelect id="call-input-device" label={translations.callMicrophone} defaultLabel={translations.callDefaultDevice}
              value={session.input} options={session.inputs} onChange={(id) => { void selectInputDevice(id); }} />
            {session.outputSupported && (
              <DeviceSelect id="call-output-device" label={translations.callAudioOutput} defaultLabel={translations.callDefaultDevice}
                value={session.output} options={session.outputs} onChange={(id) => { void selectOutputDevice(id); }} />
            )}
          </div>
          <div className="flex w-full flex-col items-center gap-3">
            <Button variant="outline" size="sm" aria-expanded={showCode} onClick={() => setShowCode((value) => !value)}>
              {showCode ? translations.callHideSecurityCode : translations.callShowSecurityCode}
            </Button>
            {showCode && <SecurityCodePanel session={session} />}
          </div>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-border bg-background px-4 py-4">
        {session.phase === 'rejoin' ? (
          <Button onClick={() => { void rejoinCall(); }}>{translations.callRejoin}</Button>
        ) : (
          <Button variant={session.muted ? 'secondary' : 'outline'} size="icon" className="h-14 w-14 rounded-full" aria-pressed={session.muted}
            aria-label={translations.callMute} title={translations.callMute}
            onClick={() => { void toggleMute(); }}>
            {session.muted ? <MicOff /> : <Mic />}
          </Button>
        )}
        <Button variant="destructive" className="h-14 rounded-full px-8" onClick={() => { void leaveCall(); }}>
          <PhoneOff aria-hidden="true" />
          {translations.callLeave}
        </Button>
        {allowedToEnd && call?.kind === 'group' && (
          <Button variant="outline" className="h-14 rounded-full" onClick={() => { void endCallForEveryone(); }}>
            {translations.callEndForEveryone}
          </Button>
        )}
      </footer>
    </section>
  );
};

export default ActiveCallPanel;
