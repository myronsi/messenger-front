import { useEffect, useRef, useState, type PointerEvent } from 'react';

interface DragToDismissOptions {
  onDismiss: () => void;
  canStart: () => boolean;
}

const LOCK_DISTANCE = 8;
const DISMISS_DISTANCE = 120;
const FLICK_SPEED = 0.5;
const FLICK_MIN = 40;
export const SETTLE_MS = 280;

export const useDragToDismiss = ({ onDismiss, canStart }: DragToDismissOptions) => {
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const gesture = useRef<{ x: number; y: number; at: number; locked: boolean } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' || dismissed || !canStart()) return;
      gesture.current = { x: event.clientX, y: event.clientY, at: performance.now(), locked: false };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = gesture.current;
      if (!current) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!current.locked) {
        if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
          gesture.current = null;
          return;
        }
        current.locked = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      setSettling(false);
      setOffset(Math.max(0, dy));
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = gesture.current;
      gesture.current = null;
      if (!current?.locked) return;
      const dy = Math.max(0, event.clientY - current.y);
      const speed = dy / Math.max(1, performance.now() - current.at);
      setSettling(true);
      if (dy > DISMISS_DISTANCE || (speed > FLICK_SPEED && dy > FLICK_MIN)) {
        setDismissed(true);
        setOffset(window.innerHeight);
        timer.current = window.setTimeout(onDismiss, SETTLE_MS);
        return;
      }
      setOffset(0);
    },
    onPointerCancel: () => {
      if (!gesture.current?.locked) {
        gesture.current = null;
        return;
      }
      gesture.current = null;
      setSettling(true);
      setOffset(0);
    },
  };

  return { handlers, offset, settling, dismissed };
};
