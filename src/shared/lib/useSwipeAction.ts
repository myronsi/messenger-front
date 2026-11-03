import { useCallback, useRef, useState, type TouchEvent } from 'react';

export const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 72;
const DIRECTION_LOCK = 10;

type TouchHandlers = Record<'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel', (event: TouchEvent) => void>;

export const useSwipeAction = (direction: 1 | -1, onSwipe?: () => void) => {
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ x: number; y: number; axis: 'x' | 'y' | null; distance: number } | null>(null);
  const latest = useRef(onSwipe);
  latest.current = onSwipe;

  const onTouchStart = useCallback((event: TouchEvent) => {
    gesture.current = latest.current && event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY, axis: null, distance: 0 }
      : null;
  }, []);

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
    const distance = Math.max(0, dx * direction);
    if (current.distance < SWIPE_THRESHOLD && distance >= SWIPE_THRESHOLD) navigator.vibrate?.(10);
    current.distance = distance;
    setOffset(distance ? Math.min(SWIPE_MAX, distance) * direction : 0);
  }, [direction]);

  const onTouchEnd = useCallback(() => {
    const current = gesture.current;
    gesture.current = null;
    setOffset(0);
    if (current?.axis === 'x' && current.distance >= SWIPE_THRESHOLD) latest.current?.();
  }, []);

  const onTouchCancel = useCallback(() => {
    gesture.current = null;
    setOffset(0);
  }, []);

  const handlers: TouchHandlers = { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
  return { offset, progress: Math.min(1, Math.abs(offset) / SWIPE_THRESHOLD), handlers };
};

export const combineTouchHandlers = (...list: Partial<TouchHandlers>[]): TouchHandlers => ({
  onTouchStart: (event) => list.forEach((handlers) => handlers.onTouchStart?.(event)),
  onTouchMove: (event) => list.forEach((handlers) => handlers.onTouchMove?.(event)),
  onTouchEnd: (event) => list.forEach((handlers) => handlers.onTouchEnd?.(event)),
  onTouchCancel: (event) => list.forEach((handlers) => handlers.onTouchCancel?.(event)),
});
