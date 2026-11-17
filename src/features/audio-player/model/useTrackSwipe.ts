import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

interface TrackSwipeOptions {
  canNext: boolean;
  canPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

interface Gesture {
  x: number;
  y: number;
  at: number;
  width: number;
  locked: boolean;
}

const LOCK_DISTANCE = 8;
const COMMIT_SHARE = 0.35;
const FLICK_SPEED = 0.45;
const FLICK_MIN = 24;
const SLIDE_MS = 170;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const useTrackSwipe = ({ canNext, canPrevious, onNext, onPrevious }: TrackSwipeOptions) => {
  const [offset, setOffset] = useState(0);
  const [animated, setAnimated] = useState(false);
  const [width, setWidth] = useState(1);
  const gesture = useRef<Gesture | null>(null);
  const swiped = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const later = (run: () => void, ms: number) => { timers.current.push(window.setTimeout(run, ms)); };
  const settle = () => {
    setAnimated(true);
    setOffset(0);
  };

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') return;
      const box = event.currentTarget.getBoundingClientRect();
      gesture.current = { x: event.clientX, y: event.clientY, at: performance.now(), width: box.width || 1, locked: false };
      swiped.current = false;
      setWidth(box.width || 1);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = gesture.current;
      if (!current) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!current.locked) {
        if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          gesture.current = null;
          return;
        }
        current.locked = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      const allowed = dx < 0 ? canNext : canPrevious;
      setAnimated(!allowed);
      setOffset(allowed ? dx : 0);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = gesture.current;
      gesture.current = null;
      if (!current?.locked) return;
      swiped.current = true;
      const dx = event.clientX - current.x;
      const speed = Math.abs(dx) / Math.max(1, performance.now() - current.at);
      const forward = dx < 0;
      const allowed = forward ? canNext : canPrevious;
      const commit = allowed && (Math.abs(dx) > current.width * COMMIT_SHARE || (speed > FLICK_SPEED && Math.abs(dx) > FLICK_MIN));
      if (!commit) {
        settle();
        return;
      }
      setAnimated(true);
      setOffset(forward ? -current.width : current.width);
      later(() => {
        if (forward) onNext();
        else onPrevious();
        setAnimated(false);
        setOffset(forward ? current.width * 0.4 : -current.width * 0.4);
        later(settle, 16);
      }, SLIDE_MS);
    },
    onPointerCancel: () => {
      if (!gesture.current?.locked) {
        gesture.current = null;
        return;
      }
      gesture.current = null;
      settle();
    },
  };

  const style: CSSProperties = {
    transform: offset ? `translateX(${offset}px)` : undefined,
    opacity: offset ? Math.max(0.35, 1 - Math.abs(offset) / width) : undefined,
    transition: animated ? `transform ${SLIDE_MS}ms ${EASE}, opacity ${SLIDE_MS}ms ${EASE}` : 'none',
    touchAction: 'pan-y',
  };

  const consumeSwipe = () => {
    const was = swiped.current;
    swiped.current = false;
    return was;
  };

  return { handlers, style, consumeSwipe };
};
