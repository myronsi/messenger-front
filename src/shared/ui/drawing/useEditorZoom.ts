import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export const MAX_ZOOM = 6;

export interface ZoomView {
  scale: number;
  x: number;
  y: number;
}

interface Box {
  width: number;
  height: number;
}

const IDENTITY: ZoomView = { scale: 1, x: 0, y: 0 };

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const middle = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function useEditorZoom(stage: HTMLElement | null, box: Box | null, panTool: boolean, onGestureStart: () => void) {
  const [view, setView] = useState<ZoomView>(IDENTITY);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; middle: { x: number; y: number }; view: ZoomView } | null>(null);
  const pan = useRef<{ id: number; x: number; y: number; view: ZoomView } | null>(null);

  const boxWidth = box?.width ?? 0;
  const boxHeight = box?.height ?? 0;
  const clamp = useCallback((next: ZoomView): ZoomView => {
    if (!boxWidth || !boxHeight) return IDENTITY;
    const scale = Math.min(MAX_ZOOM, Math.max(1, next.scale));
    const limitX = (boxWidth * (scale - 1)) / 2;
    const limitY = (boxHeight * (scale - 1)) / 2;
    const clamped = { scale, x: Math.max(-limitX, Math.min(limitX, next.x)), y: Math.max(-limitY, Math.min(limitY, next.y)) };
    return clamped.scale === next.scale && clamped.x === next.x && clamped.y === next.y ? next : clamped;
  }, [boxWidth, boxHeight]);

  const zoomAt = useCallback((from: ZoomView, scale: number, clientX: number, clientY: number) => {
    const rect = stage?.getBoundingClientRect();
    if (!rect) return from;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const target = Math.min(MAX_ZOOM, Math.max(1, scale));
    const offsetX = (clientX - centerX - from.x) / from.scale;
    const offsetY = (clientY - centerY - from.y) / from.scale;
    return clamp({ scale: target, x: clientX - centerX - target * offsetX, y: clientY - centerY - target * offsetY });
  }, [clamp, stage]);

  const zoomBy = useCallback((factor: number) => {
    const rect = stage?.getBoundingClientRect();
    if (!rect) return;
    setView((current) => zoomAt(current, current.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2));
  }, [stage, zoomAt]);

  const reset = useCallback(() => setView(IDENTITY), []);

  useEffect(() => {
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((current) => zoomAt(current, current.scale * Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [stage, zoomAt]);

  useEffect(() => { setView((current) => clamp(current)); }, [clamp]);

  const onPointerDownCapture = (event: ReactPointerEvent) => {
    if (event.pointerType === 'touch') pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const touches = [...pointers.current.values()];
    if (touches.length === 2) {
      onGestureStart();
      pan.current = null;
      pinch.current = { distance: distance(touches[0], touches[1]), middle: middle(touches[0], touches[1]), view };
      event.stopPropagation();
    } else if (touches.length > 2) {
      event.stopPropagation();
    } else if (panTool || event.button === 1) {
      pan.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view };
      try { (event.currentTarget as Element).setPointerCapture?.(event.pointerId); } catch { pan.current = null; return; }
      event.stopPropagation();
      event.preventDefault();
    }
  };

  const onPointerMoveCapture = (event: ReactPointerEvent) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = pinch.current;
    const touches = [...pointers.current.values()];
    if (gesture && touches.length >= 2) {
      const center = middle(touches[0], touches[1]);
      const scale = gesture.view.scale * (distance(touches[0], touches[1]) / Math.max(1, gesture.distance));
      const zoomed = zoomAt(gesture.view, scale, gesture.middle.x, gesture.middle.y);
      setView(clamp({ ...zoomed, x: zoomed.x + center.x - gesture.middle.x, y: zoomed.y + center.y - gesture.middle.y }));
      event.stopPropagation();
    } else if (pan.current?.id === event.pointerId) {
      const start = pan.current;
      setView(clamp({ ...start.view, x: start.view.x + event.clientX - start.x, y: start.view.y + event.clientY - start.y }));
      event.stopPropagation();
    }
  };

  const onPointerEndCapture = (event: ReactPointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pan.current?.id === event.pointerId) {
      pan.current = null;
      event.stopPropagation();
    }
  };

  return {
    view,
    zoomBy,
    reset,
    isGesturing: () => pointers.current.size >= 2 || !!pan.current,
    handlers: {
      onPointerDownCapture,
      onPointerMoveCapture,
      onPointerUpCapture: onPointerEndCapture,
      onPointerCancelCapture: onPointerEndCapture,
    },
  };
}
