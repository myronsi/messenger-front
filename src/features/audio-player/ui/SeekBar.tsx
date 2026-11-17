import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/shared/lib/utils';

interface SeekBarProps {
  time: number;
  duration: number;
  label: string;
  onSeek: (seconds: number) => void;
  variant?: 'thin' | 'full';
  className?: string;
}

const KEY_STEP = 5;

export const SeekBar = ({ time, duration, label, onSeek, variant = 'full', className }: SeekBarProps) => {
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const usable = duration > 0;
  const shown = dragging ?? time;
  const percent = usable ? Math.min(100, Math.max(0, (shown / duration) * 100)) : 0;

  const at = (event: PointerEvent<HTMLDivElement>) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return 0;
    return Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * duration;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!usable) return;
    const step = event.key === 'ArrowRight' ? KEY_STEP : event.key === 'ArrowLeft' ? -KEY_STEP : 0;
    if (!step) return;
    event.preventDefault();
    onSeek(Math.min(duration, Math.max(0, time + step)));
  };

  const thin = variant === 'thin';
  return (
    <div ref={track} role="slider" tabIndex={usable ? 0 : -1} aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)} data-testid={`seek-${variant}`} onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        if (!usable) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(at(event));
      }}
      onPointerMove={(event) => { if (dragging !== null) setDragging(at(event)); }}
      onPointerUp={(event) => {
        if (dragging === null) return;
        onSeek(at(event));
        setDragging(null);
      }}
      onPointerCancel={() => setDragging(null)}
      className={cn('group relative flex touch-none items-center outline-none', usable && 'cursor-pointer', thin ? 'h-3' : 'h-5', className)}>
      <span className={cn('relative w-full overflow-hidden rounded-full bg-primary/15', thin ? 'h-0.5 group-hover:h-1' : 'h-1.5')}>
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </span>
      {usable && (
        <span aria-hidden="true"
          className={cn('absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow transition-opacity',
            thin ? 'h-2.5 w-2.5 opacity-0 group-hover:opacity-100' : 'h-4 w-4 group-focus-visible:ring-2 group-focus-visible:ring-ring',
            dragging !== null && 'opacity-100')}
          style={{ left: `${percent}%` }} />
      )}
    </div>
  );
};
