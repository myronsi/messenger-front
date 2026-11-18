import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react';

interface DragToDismissOptions {
  onDismiss: () => void;
  canStart: () => boolean;
  area?: RefObject<HTMLElement | null>;
}

type Move = 'none' | 'pending' | 'locked';

const LOCK_DISTANCE = 8;
const DISMISS_DISTANCE = 120;
const FLICK_SPEED = 0.5;
const FLICK_MIN = 40;
const OWN_GESTURES = '.touch-none, input, textarea, select, [contenteditable="true"]';
export const SETTLE_MS = 280;

export const useDragToDismiss = ({ onDismiss, canStart, area }: DragToDismissOptions) => {
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const gesture = useRef<{ x: number; y: number; at: number; locked: boolean } | null>(null);
  const timer = useRef<number | null>(null);
  const done = useRef(false);
  const options = useRef({ onDismiss, canStart });

  useEffect(() => {
    options.current = { onDismiss, canStart };
  }, [onDismiss, canStart]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const drag = useMemo(() => ({
    begin: (x: number, y: number) => {
      gesture.current = done.current || !options.current.canStart() ? null : { x, y, at: performance.now(), locked: false };
    },
    move: (x: number, y: number): Move => {
      const current = gesture.current;
      if (!current) return 'none';
      const dx = x - current.x;
      const dy = y - current.y;
      if (!current.locked) {
        if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return dy > 0 && dy >= Math.abs(dx) ? 'pending' : 'none';
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
          gesture.current = null;
          return 'none';
        }
        current.locked = true;
      }
      setSettling(false);
      setOffset(Math.max(0, dy));
      return 'locked';
    },
    end: (y: number) => {
      const current = gesture.current;
      gesture.current = null;
      if (!current?.locked) return;
      const dy = Math.max(0, y - current.y);
      const speed = dy / Math.max(1, performance.now() - current.at);
      setSettling(true);
      if (dy > DISMISS_DISTANCE || (speed > FLICK_SPEED && dy > FLICK_MIN)) {
        done.current = true;
        setDismissed(true);
        setOffset(window.innerHeight);
        timer.current = window.setTimeout(() => options.current.onDismiss(), SETTLE_MS);
        return;
      }
      setOffset(0);
    },
    cancel: () => {
      const locked = gesture.current?.locked;
      gesture.current = null;
      if (!locked) return;
      setSettling(true);
      setOffset(0);
    },
  }), []);

  useEffect(() => {
    const node = area?.current;
    if (!node) return undefined;
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const own = event.target instanceof Element && event.target.closest(OWN_GESTURES);
      if (event.touches.length !== 1 || !touch || own) {
        gesture.current = null;
        return;
      }
      drag.begin(touch.clientX, touch.clientY);
    };
    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch && drag.move(touch.clientX, touch.clientY) !== 'none' && event.cancelable) event.preventDefault();
    };
    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (touch) drag.end(touch.clientY);
    };
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd);
    node.addEventListener('touchcancel', drag.cancel);
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', drag.cancel);
    };
  }, [area, drag]);

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') return;
      drag.begin(event.clientX, event.clientY);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const wasLocked = gesture.current?.locked;
      if (drag.move(event.clientX, event.clientY) === 'locked' && !wasLocked) event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => drag.end(event.clientY),
    onPointerCancel: drag.cancel,
  };

  return { handlers, offset, settling, dismissed };
};
