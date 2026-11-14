import type { EntityId } from '@/shared/api/entityId';

interface AudioProgressProps {
  variant: 'voice' | 'music';
  messageId: EntityId;
  waveform: number[];
  progress: number;
  pulse: boolean;
}

const AudioProgress = ({ variant, messageId, waveform, progress, pulse }: AudioProgressProps) => {
  if (variant === 'music') {
    return (
      <span data-testid="audio-line" className="absolute inset-x-1.5 top-1/2 h-1 -translate-y-1/2 rounded-full">
        <span className="absolute inset-0 rounded-full bg-current opacity-35" />
        <span className="absolute inset-y-0 left-0 rounded-full bg-current" style={{ width: `${progress}%` }} />
        <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-sm" style={{ left: `${progress}%` }} />
      </span>
    );
  }
  return (
    <>
      {[false, true].map((played) => (
        <span
          key={played ? 'played' : 'rest'}
          aria-hidden={played}
          className={`absolute inset-0 flex items-center gap-[2px] ${played ? '' : 'opacity-35'}`}
          style={played ? { clipPath: `inset(0 ${100 - progress}% 0 0)` } : undefined}
        >
          {waveform.map((barHeight, index) => (
            <span
              key={`${messageId}-waveform-${index}`}
              data-testid={played ? undefined : 'waveform-bar'}
              className={`block min-w-[2px] flex-1 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`}
              style={{ height: `${Math.round(3 + barHeight * 22)}px` }}
            />
          ))}
        </span>
      ))}
    </>
  );
};

export default AudioProgress;
