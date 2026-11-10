import { useCallback, useRef, type TouchEvent } from 'react';

export const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP = 10;

export const useLongPress = (onLongPress?: () => void) => {
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const fired = useRef(false);
  const latest = useRef(onLongPress);
  latest.current = onLongPress;

  const cancel = useCallback(() => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  }, []);

  const onTouchStart = useCallback((event: TouchEvent) => {
    cancel();
    fired.current = false;
    if (!latest.current || event.touches.length !== 1) return;
    const { clientX: x, clientY: y } = event.touches[0];
    press.current = {
      x, y, timer: window.setTimeout(() => {
        press.current = null;
        fired.current = true;
        navigator.vibrate?.(15);
        latest.current?.();
      }, LONG_PRESS_MS),
    };
  }, [cancel]);

  const onTouchMove = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (press.current && touch && Math.hypot(touch.clientX - press.current.x, touch.clientY - press.current.y) > LONG_PRESS_SLOP) cancel();
  }, [cancel]);

  const consumeClick = useCallback(() => {
    const was = fired.current;
    fired.current = false;
    return was;
  }, []);

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd: cancel, onTouchCancel: cancel }, consumeClick };
};
