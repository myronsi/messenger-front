import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { roundCoordinate } from './model';

const DRAG_START = 6;

interface TextGrabOptions {
  x: number;
  y: number;
  box: { width: number; height: number };
  zoom: number;
  onMove: (x: number, y: number) => void;
  onGrab: () => void;
}

interface Grab {
  id: number;
  clientX: number;
  clientY: number;
  x: number;
  y: number;
  moved: boolean;
}

export type TextGrabHandlers = ReturnType<typeof useTextGrab>;

export const useTextGrab = (options: TextGrabOptions) => {
  const latest = useRef(options);
  latest.current = options;
  const grab = useRef<Grab | null>(null);
  return useMemo(() => {
    const end = (event: ReactPointerEvent<HTMLElement>) => {
      if (grab.current?.id === event.pointerId) grab.current = null;
    };
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        event.stopPropagation();
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const { x, y } = latest.current;
        grab.current = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, x, y, moved: false };
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        const current = grab.current;
        if (!current || current.id !== event.pointerId) return;
        const shiftX = event.clientX - current.clientX;
        const shiftY = event.clientY - current.clientY;
        const { box, zoom, onMove, onGrab } = latest.current;
        if (!current.moved) {
          if (Math.hypot(shiftX, shiftY) < DRAG_START) return;
          current.moved = true;
          try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { grab.current = null; return; }
          onGrab();
        }
        event.preventDefault();
        onMove(roundCoordinate(current.x + shiftX / zoom / box.width), roundCoordinate(current.y + shiftY / zoom / box.height));
      },
      onPointerUp: end,
      onPointerCancel: end,
    };
  }, []);
};
