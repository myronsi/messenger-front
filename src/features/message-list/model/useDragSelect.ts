import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { Message, MessageSelection } from '@/entities/message';
import type { PressInput } from '@/shared/lib/useLongPress';
import { useLatestRef } from '@/shared/lib/useLatestRef';

export const DRAG_EDGE_PX = 72;
export const DRAG_MAX_SPEED = 16;

interface DragSelectOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  messages: Message[];
  selection?: MessageSelection;
}

export const rowIdAt = (x: number, y: number) => {
  const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-message-id]');
  return row?.dataset.messageId ?? null;
};

export const edgeScrollSpeed = (y: number, top: number, bottom: number) => {
  if (y < top + DRAG_EDGE_PX) return -Math.ceil(DRAG_MAX_SPEED * Math.min(1, (top + DRAG_EDGE_PX - y) / DRAG_EDGE_PX));
  if (y > bottom - DRAG_EDGE_PX) return Math.ceil(DRAG_MAX_SPEED * Math.min(1, (y - bottom + DRAG_EDGE_PX) / DRAG_EDGE_PX));
  return 0;
};

export const useDragSelect = ({ containerRef, messages, selection }: DragSelectOptions) => {
  const messagesRef = useLatestRef(messages);
  const selectionRef = useLatestRef(selection);
  const stopRef = useRef<() => void>(() => undefined);

  useEffect(() => () => stopRef.current(), []);

  const begin = useCallback((message: Message, input: PressInput = 'touch') => {
    const current = selectionRef.current;
    if (!current?.beginDrag) return;
    stopRef.current();
    current.beginDrag(message);
    let point: { x: number; y: number } | null = null;
    let lastId = String(message.id);
    let frame = 0;
    const pick = () => {
      if (!point) return;
      const id = rowIdAt(point.x, point.y);
      if (!id || id === lastId) return;
      const target = messagesRef.current.find((item) => String(item.id) === id);
      if (!target) return;
      lastId = id;
      selectionRef.current?.dragTo?.(target);
    };
    const tick = () => {
      const container = containerRef.current;
      if (container && point) {
        const rect = container.getBoundingClientRect();
        const speed = edgeScrollSpeed(point.y, rect.top, rect.bottom);
        if (speed) {
          container.scrollTop += speed;
          pick();
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const follow = (x: number, y: number, event: Event) => {
      if (event.cancelable) event.preventDefault();
      point = { x, y };
      pick();
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) follow(touch.clientX, touch.clientY, event);
    };
    const onMouseMove = (event: MouseEvent) => follow(event.clientX, event.clientY, event);
    const blockTextSelection = (event: Event) => event.preventDefault();
    const [moveEvent, endEvents] = input === 'mouse' ? ['mousemove', ['mouseup']] : ['touchmove', ['touchend', 'touchcancel']];
    const onMove = (input === 'mouse' ? onMouseMove : onTouchMove) as EventListener;
    const stop = () => {
      cancelAnimationFrame(frame);
      document.removeEventListener(moveEvent, onMove);
      document.removeEventListener('selectstart', blockTextSelection);
      endEvents.forEach((name) => document.removeEventListener(name, stop));
      stopRef.current = () => undefined;
    };
    document.addEventListener(moveEvent, onMove, { passive: false });
    document.addEventListener('selectstart', blockTextSelection);
    endEvents.forEach((name) => document.addEventListener(name, stop));
    frame = requestAnimationFrame(tick);
    stopRef.current = stop;
  }, [containerRef, messagesRef, selectionRef]);

  return selection?.beginDrag ? begin : undefined;
};
