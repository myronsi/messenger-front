import { useRef, useState, type PointerEvent } from 'react';

interface QueueDrag {
  from: number;
  to: number;
  dy: number;
}

export const dropIndex = (from: number, dy: number, rowHeight: number, count: number) => (
  Math.min(count - 1, Math.max(0, from + Math.round(dy / rowHeight)))
);

export const useQueueDrag = (count: number, rowHeight: number, onMove: (from: number, to: number) => void) => {
  const [drag, setDrag] = useState<QueueDrag | null>(null);
  const start = useRef<{ from: number; y: number } | null>(null);

  const handle = (index: number) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch (error) {
        if (!(error instanceof DOMException)) throw error;
      }
      start.current = { from: index, y: event.clientY };
      setDrag({ from: index, to: index, dy: 0 });
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (!start.current) return;
      const dy = event.clientY - start.current.y;
      setDrag({ from: start.current.from, to: dropIndex(start.current.from, dy, rowHeight, count), dy });
    },
    onPointerUp: () => {
      const current = drag;
      start.current = null;
      setDrag(null);
      if (current && current.from !== current.to) onMove(current.from, current.to);
    },
    onPointerCancel: () => {
      start.current = null;
      setDrag(null);
    },
  });

  const offsetOf = (index: number) => {
    if (!drag) return 0;
    if (index === drag.from) return drag.dy;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -rowHeight;
    if (drag.from > drag.to && index >= drag.to && index < drag.from) return rowHeight;
    return 0;
  };

  return { handle, offsetOf, draggingIndex: drag?.from ?? null };
};
