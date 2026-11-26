import React, { useState } from 'react';
import {
  Ellipsis, Lock, Mic, MicOff, Minimize2, PhoneOff, RotateCw, SignalHigh, SlidersHorizontal, Volume2, WifiOff,
} from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { Button } from '@/shared/ui/button';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { cn } from '@/shared/lib/utils';
import type { Call } from '../api/callsApi';
import { leaveCall, rejoinCall } from '../model/callController';
import { enableCallAudio, selectInputDevice, selectOutputDevice, toggleMute } from '../model/callControls';
import { minimizeCall } from '../model/callView';
import { canEndForEveryone } from '../model/permissions';
import type { CallSession } from '../model/stores';
import CallControl from './CallControl';
import CallMoreSheet from './CallMoreSheet';
import CallSheet from './CallSheet';
import CallWarnings from './CallWarnings';
import DeviceList from './DeviceList';
import { useCallAvatar, useCallTitle, useGroupInfo } from './callHooks';
import { useCallStatus } from './useCallStatus';

interface ActiveCallPanelProps {
  call: Call | null;
  session: CallSession;
  userId: string | null;
}

type Sheet = 'devices' | 'more' | null;

const TOP_BUTTON = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/80 text-foreground transition-colors hover:bg-accent '
  + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const ringColor = (phase: CallSession['phase']) => (
  phase === 'connected' ? 'border-success' : phase === 'rejoin' ? 'border-destructive' : 'border-warning'
);

const ActiveCallPanel: React.FC<ActiveCallPanelProps> = ({ call, session, userId }) => {
  const { translations } = useLanguage();
  const [sheet, setSheet] = useState<Sheet>(null);
  const { title } = useCallTitle(call, userId);
  const avatar = useCallAvatar(call, userId);
  const group = useGroupInfo(call);
  const { phaseText, timer, poorNetwork } = useCallStatus(call, session);
  const allowedToEnd = !!call && canEndForEveryone(call, userId, group.role);
  const name = title || translations.callPanelTitle;
  const goodNetwork = session.phase === 'connected' && session.quality === 'good';
  const closeSheet = () => setSheet(null);

  return (
    <section aria-label={translations.callPanelTitle}
      className="relative flex h-full w-full flex-col overflow-hidden bg-background bg-gradient-to-b from-muted/60 via-background to-background">
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
        <button type="button" className={TOP_BUTTON} aria-label={translations.callMinimize} title={translations.callMinimize} onClick={minimizeCall}>
          <Minimize2 className="h-5 w-5" aria-hidden="true" />
        </button>
        {session.encryption !== 'failed' && (
          <button type="button" onClick={() => setSheet('more')} aria-haspopup="dialog"
            className={cn(
              'flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              session.encryption === 'ready' ? 'bg-success-soft text-success hover:bg-success-soft/80' : 'bg-muted text-muted-foreground hover:bg-accent',
            )}>
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{session.encryption === 'ready' ? translations.callEncrypted : translations.callEncryptionPending}</span>
          </button>
        )}
        <button type="button" className={TOP_BUTTON} aria-label={translations.callMore} title={translations.callMore} aria-haspopup="dialog"
          onClick={() => setSheet('more')}>
          <Ellipsis className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <CallWarnings session={session} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 overflow-y-auto px-6 py-6 text-center">
        <div className={cn('rounded-full border-[3px] p-1.5 transition-colors', ringColor(session.phase))}>
          <AuthenticatedImage src={avatar} initialsFrom={name} alt="" loading="eager"
            className="h-32 w-32 rounded-full object-cover sm:h-36 sm:w-36" />
        </div>
        <p className="mt-4 max-w-full truncate text-2xl font-semibold"><EmojiText text={name} /></p>
        <p className="flex items-center gap-1 text-base text-muted-foreground">
          {timer && <span className="tabular-nums">{timer}</span>}
          <span aria-live="polite" className={timer ? 'sr-only' : undefined}>{phaseText}</span>
        </p>
        {poorNetwork && (
          <p className="flex items-center gap-1 text-xs text-warning"><WifiOff className="h-3.5 w-3.5" aria-hidden="true" />{translations.callPoorNetwork}</p>
        )}
        {goodNetwork && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <SignalHigh className="h-3.5 w-3.5 text-success" aria-hidden="true" />{translations.callGoodNetwork}
          </p>
        )}
        {session.audioBlocked && (
          <div className="mt-4 flex w-full max-w-sm items-center gap-2 rounded-xl bg-warning-soft p-2 text-left text-sm text-warning">
            <span className="flex-1">{translations.callAudioBlocked}</span>
            <Button size="sm" onClick={() => { void enableCallAudio(); }}><Volume2 aria-hidden="true" />{translations.callEnableAudio}</Button>
          </div>
        )}
      </div>
      <footer className="flex items-start justify-center gap-4 px-4 pb-8 pt-4 sm:gap-6">
        {session.phase === 'rejoin' ? (
          <CallControl icon={RotateCw} label={translations.callRejoin} tone="primary" onClick={() => { void rejoinCall(); }} />
        ) : (
          <CallControl icon={session.muted ? MicOff : Mic} label={session.muted ? translations.callMuted : translations.callMuteShort}
            ariaLabel={translations.callMute} pressed={session.muted} tone={session.muted ? 'active' : 'default'}
            onClick={() => { void toggleMute(); }} />
        )}
        <CallControl icon={SlidersHorizontal} label={translations.callDevices} hasPopup onClick={() => setSheet('devices')} />
        <CallControl icon={PhoneOff} label={translations.callLeave} tone="danger" onClick={() => { void leaveCall(); }} />
      </footer>
      <CallSheet open={sheet === 'devices'} title={translations.callDevices} onClose={closeSheet}>
        <DeviceList label={translations.callMicrophone} defaultLabel={translations.callDefaultDevice} icon={Mic}
          value={session.input} options={session.inputs} onChange={(id) => { void selectInputDevice(id); }} />
        {session.outputSupported && (
          <DeviceList label={translations.callAudioOutput} defaultLabel={translations.callDefaultDevice} icon={Volume2}
            value={session.output} options={session.outputs} onChange={(id) => { void selectOutputDevice(id); }} />
        )}
      </CallSheet>
      <CallSheet open={sheet === 'more'} title={translations.callMore} onClose={closeSheet}>
        <CallMoreSheet call={call} session={session} userId={userId} allowedToEnd={allowedToEnd} />
      </CallSheet>
    </section>
  );
};

export default ActiveCallPanel;
