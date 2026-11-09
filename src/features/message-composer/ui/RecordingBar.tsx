import React from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { formatAudioTime } from '@/entities/message';
import LiveWaveform from './LiveWaveform';

interface RecordingBarProps {
  seconds: number;
  stream: MediaStream | null;
  locked: boolean;
  paused: boolean;
  pauseLabel: string;
  resumeLabel: string;
  cancelLabel: string;
  onTogglePause: () => void;
  onDiscard: () => void;
}

const iconButton = 'motion-press grid size-8 shrink-0 place-items-center rounded-full text-destructive transition-colors hover:bg-destructive/15';

const RecordingBar: React.FC<RecordingBarProps> = ({
  seconds, stream, locked, paused, pauseLabel, resumeLabel, cancelLabel, onTogglePause, onDiscard,
}) => (
  <div data-testid="recording-bar" className="motion-reply-in flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-destructive-soft pl-3 pr-1 text-sm text-destructive">
    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full bg-destructive ${paused ? 'opacity-50' : 'animate-pulse'}`} />
    <span className="shrink-0 font-semibold tabular-nums">{formatAudioTime(seconds)}</span>
    <LiveWaveform stream={stream} paused={paused} />
    {locked && (
      <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={onTogglePause} aria-label={paused ? resumeLabel : pauseLabel}
        title={paused ? resumeLabel : pauseLabel} className={iconButton}>
        {paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
      </button>
    )}
    <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={onDiscard} aria-label={cancelLabel} title={cancelLabel} className={iconButton}>
      <Trash2 className="size-4" />
    </button>
  </div>
);

export default RecordingBar;
