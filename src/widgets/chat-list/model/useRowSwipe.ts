import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';

export const ROW_SLIDE_MS = 220;
export const ROW_COLLAPSE_MS = 200;
export const ROW_SETTLE_MS = 340;
const DIRECTION_LOCK = 10;
const FLICK_VELOCITY = 0.6;
const FLICK_MIN = 48;
const RESET_AFTER_MS = 1600;

export type RowSwipePhase = 'idle' | 'dragging' | 'settling' | 'leaving';

export const rowSwipeThreshold = (width: number) => Math.min(160, Math.max(80, width * 0.35));

export const rubberBand = (pull: number, width: number) => {
  const limit = width * 0.7;
  return pull <= limit ? pull : limit + (pull - limit) * 0.25;
};

type Gesture = { x: number; y: number; axis: 'x' | 'y' | null; width: number; pull: number; lastX: number; lastTime: number; velocity: number };

export const useRowSwipe = (onCommit?: () => void) => {
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<RowSwipePhase>('idle');
  const [armed, setArmed] = useState(false);
  const [width, setWidth] = useState(0);
  const gesture = useRef<Gesture | null>(null);
  const timers = useRef<number[]>([]);
  const latest = useRef(onCommit);
  latest.current = onCommit;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);
  const later = useCallback((run: () => void, delay: number) => { timers.current.push(window.setTimeout(run, delay)); }, []);

  const settle = useCallback(() => {
    gesture.current = null;
    setArmed(false);
    setOffset(0);
    setPhase((current) => (current === 'dragging' ? 'settling' : current));
    later(() => setPhase((current) => (current === 'settling' ? 'idle' : current)), ROW_SETTLE_MS);
  }, [later]);

  const onTouchStart = useCallback((event: TouchEvent) => {
    if (!latest.current || event.touches.length !== 1 || phase === 'leaving') {
      gesture.current = null;
      return;
    }
    const touch = event.touches[0];
    const rowWidth = (event.currentTarget as HTMLElement).offsetWidth || window.innerWidth;
    gesture.current = {
      x: touch.clientX, y: touch.clientY, axis: null, width: rowWidth, pull: 0, lastX: touch.clientX, lastTime: event.timeStamp, velocity: 0,
    };
    setWidth(rowWidth);
  }, [phase]);

  const onTouchMove = useCallback((event: TouchEvent) => {
    const current = gesture.current;
    const touch = event.touches[0];
    if (!current || !touch) return;
    const dx = touch.clientX - current.x;
    const dy = touch.clientY - current.y;
    if (!current.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_LOCK) return;
      current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (current.axis !== 'x') return;
    const elapsed = Math.max(1, event.timeStamp - current.lastTime);
    current.velocity = (current.lastX - touch.clientX) / elapsed;
    current.lastX = touch.clientX;
    current.lastTime = event.timeStamp;
    current.pull = Math.max(0, -dx);
    const isArmed = current.pull >= rowSwipeThreshold(current.width);
    setArmed((was) => {
      if (isArmed && !was) navigator.vibrate?.(10);
      return isArmed;
    });
    setPhase('dragging');
    setOffset(-rubberBand(current.pull, current.width));
  }, []);

  const onTouchEnd = useCallback(() => {
    const current = gesture.current;
    if (!current || current.axis !== 'x') {
      gesture.current = null;
      return;
    }
    const commit = current.pull >= rowSwipeThreshold(current.width) || (current.velocity > FLICK_VELOCITY && current.pull > FLICK_MIN);
    if (!commit) {
      settle();
      return;
    }
    gesture.current = null;
    setArmed(true);
    setPhase('leaving');
    setOffset(-(current.width + 24));
    later(() => latest.current?.(), ROW_SLIDE_MS + ROW_COLLAPSE_MS);
    later(() => {
      setPhase('idle');
      setArmed(false);
      setOffset(0);
    }, RESET_AFTER_MS);
  }, [later, settle]);

  return {
    offset, phase, armed, width,
    progress: Math.min(1, -offset / rowSwipeThreshold(width || 1)),
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: settle },
  };
};
