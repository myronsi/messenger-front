import React from 'react';
import { Pause, Play, X } from 'lucide-react';
import LiveWaveform from './LiveWaveform';

interface RecordingBarProps {
  seconds: number;
  stream: MediaStream | null;
  locked: boolean;
  paused: boolean;
  pauseLabel: string;
  resumeLabel: string;
  onTogglePause: () => void;
  onDiscard: () => void;
}

const RecordingBar: React.FC<RecordingBarProps> = ({ seconds, stream, locked, paused, pauseLabel, resumeLabel, onTogglePause, onDiscard }) => (
  <div className="motion-reply-in flex min-h-10 min-w-0 flex-1 items-center rounded-full bg-red-50 pl-3 pr-2 text-sm text-red-600">
    <LiveWaveform stream={stream} paused={paused} />
    {locked && (
      <button
        type="button"
        onPointerDown={(event) => event.preventDefault()}
        onClick={onTogglePause}
        aria-label={paused ? resumeLabel : pauseLabel}
        className="motion-press ml-2 shrink-0 rounded-full p-1 text-red-600 transition-colors hover:bg-red-100"
      >
        {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
      </button>
    )}
    <button
      type="button"
      onPointerDown={(event) => event.preventDefault()}
      onClick={onDiscard}
      aria-label="Cancel recording"
      className="motion-press ml-2 shrink-0 rounded-full p-1 text-red-600 transition-colors hover:bg-red-100"
    >
      <X className="h-4 w-4" />
    </button>
    <span className="ml-1 shrink-0 font-semibold tabular-nums">{seconds}s</span>
  </div>
);

export default RecordingBar;
