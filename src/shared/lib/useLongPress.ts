import { useCallback, useRef, type PointerEvent, type TouchEvent } from 'react';

export const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP = 10;
const INTERACTIVE = 'a, button:not([data-selection-check]), input, textarea, select, audio, video, [role="slider"], [contenteditable="true"]';

export type PressInput = 'touch' | 'mouse';

interface LongPressOptions {
  mouse?: boolean;
}

const isInteractive = (target: EventTarget | null) => target instanceof Element && !!target.closest(INTERACTIVE);

type Press = { timer: number; x: number; y: number } | null;
const movedTooFar = (press: Press, x: number, y: number) => !!press && Math.hypot(x - press.x, y - press.y) > LONG_PRESS_SLOP;

export const useLongPress = (onLongPress?: (input: PressInput) => void, { mouse = false }: LongPressOptions = {}) => {
  const press = useRef<Press>(null);
  const fired = useRef(false);
  const latest = useRef(onLongPress);
  latest.current = onLongPress;

  const cancel = useCallback(() => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  }, []);

  const startPress = useCallback((x: number, y: number, input: PressInput) => {
    press.current = {
      x, y, timer: window.setTimeout(() => {
        press.current = null;
        fired.current = true;
        if (input === 'touch') navigator.vibrate?.(15);
        else window.getSelection()?.removeAllRanges();
        latest.current?.(input);
      }, LONG_PRESS_MS),
    };
  }, []);

  const onTouchStart = useCallback((event: TouchEvent) => {
    cancel();
    fired.current = false;
    if (!latest.current || event.touches.length !== 1) return;
    startPress(event.touches[0].clientX, event.touches[0].clientY, 'touch');
  }, [cancel, startPress]);

  const onTouchMove = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (touch && movedTooFar(press.current, touch.clientX, touch.clientY)) cancel();
  }, [cancel]);

  const onPointerDown = useCallback((event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    cancel();
    fired.current = false;
    if (!latest.current || event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey || isInteractive(event.target)) return;
    startPress(event.clientX, event.clientY, 'mouse');
  }, [cancel, startPress]);

  const onPointerMove = useCallback((event: PointerEvent) => {
    if (event.pointerType === 'mouse' && movedTooFar(press.current, event.clientX, event.clientY)) cancel();
  }, [cancel]);

  const consumeClick = useCallback(() => {
    const was = fired.current;
    fired.current = false;
    return was;
  }, []);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd: cancel, onTouchCancel: cancel },
    mouseHandlers: mouse ? { onPointerDown, onPointerMove, onPointerUp: cancel, onPointerLeave: cancel } : {},
    consumeClick,
  };
};
