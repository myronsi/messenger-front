import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { formatAudioTime } from '@/entities/message';

const KEY_STEP = 0.5;

interface TrimHandleProps {
  edge: 'start' | 'end';
  percent: number;
  seconds: number;
  label: string;
  onMove: (clientX: number) => void;
  onStep: (delta: number) => void;
}

export function TrimHandle({ edge, percent, seconds, label, onMove, onStep }: TrimHandleProps) {
  const pointerRef = useRef<number | null>(null);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current === event.pointerId) onMove(event.clientX);
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current === event.pointerId) pointerRef.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') onStep(KEY_STEP);
    else if (event.key === 'ArrowLeft') onStep(-KEY_STEP);
    else return;
    event.preventDefault();
  };
  return (
    <div role="slider" tabIndex={0} data-testid={`trim-${edge}`} aria-label={label} aria-valuetext={formatAudioTime(seconds)}
      aria-valuenow={Math.round(seconds * 10) / 10} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onKeyDown={onKeyDown}
      className="group absolute inset-y-0 z-10 flex w-6 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      style={{ left: `${percent}%` }}>
      <span className="h-5 w-1 rounded-full bg-primary/60 transition-colors group-hover:bg-primary group-active:bg-primary" />
    </div>
  );
}
