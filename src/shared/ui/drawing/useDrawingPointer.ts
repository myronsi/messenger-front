import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import {
  coordinateCount, hitsItem, MAX_DRAWING_COORDINATES, MAX_DRAWING_ITEMS, roundCoordinate, shouldExtend, type DrawingItem,
} from './model';

export type DrawingTool = 'pen' | 'eraser' | 'text' | 'pan';

const ERASER_RADIUS = 0.025;

interface DrawingPointerOptions {
  surfaceRef: RefObject<Element | null>;
  tool: DrawingTool;
  color: string;
  width: number;
  aspect: number;
  zoom: number;
  items: DrawingItem[];
  commit: (items: DrawingItem[]) => void;
  onPlaceText: (x: number, y: number) => boolean;
  onDragText: (dx: number, dy: number) => void;
  onLimit: () => void;
  isGesturing: () => boolean;
}

export function useDrawingPointer({
  surfaceRef, tool, color, width, aspect, zoom, items, commit, onPlaceText, onDragText, onLimit, isGesturing,
}: DrawingPointerOptions) {
  const [draft, setDraft] = useState<DrawingItem | null>(null);
  const [erased, setErased] = useState<DrawingItem[] | null>(null);
  const pointsRef = useRef<number[]>([]);
  const activeRef = useRef<number | null>(null);
  const grabRef = useRef<{ x: number; y: number } | null>(null);

  const position = (event: ReactPointerEvent) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  };

  const erase = (current: DrawingItem[], x: number, y: number) => {
    const kept = current.filter((item) => !hitsItem(item, x, y, aspect, ERASER_RADIUS / zoom));
    return kept.length === current.length ? current : kept;
  };

  const extend = (x: number, y: number) => {
    const points = pointsRef.current;
    if (!shouldExtend(points, x, y)) return;
    if (coordinateCount(items) + points.length + 2 > MAX_DRAWING_COORDINATES) {
      onLimit();
      return;
    }
    points.push(roundCoordinate(x), roundCoordinate(y));
    setDraft({ type: 'stroke', color, width, points });
  };

  const onPointerDown = (event: ReactPointerEvent<Element>) => {
    if (tool === 'pan' || isGesturing() || activeRef.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const point = position(event);
    if (!point) return;
    event.preventDefault();
    if (tool === 'text') {
      if (!onPlaceText(roundCoordinate(point.x), roundCoordinate(point.y))) return;
      try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { return; }
      activeRef.current = event.pointerId;
      grabRef.current = point;
      return;
    }
    if (tool === 'pen' && items.length >= MAX_DRAWING_ITEMS) {
      onLimit();
      return;
    }
    activeRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      activeRef.current = null;
      return;
    }
    if (tool === 'eraser') {
      setErased(erase(items, point.x, point.y));
      return;
    }
    pointsRef.current = [];
    extend(point.x, point.y);
  };

  const onPointerMove = (event: ReactPointerEvent<Element>) => {
    if (activeRef.current !== event.pointerId) return;
    if (grabRef.current) {
      const point = position(event);
      if (point) onDragText(point.x - grabRef.current.x, point.y - grabRef.current.y);
      return;
    }
    const events = 'getCoalescedEvents' in event.nativeEvent ? event.nativeEvent.getCoalescedEvents() : [];
    const samples = events.length ? events : [event.nativeEvent];
    for (const sample of samples) {
      const point = position(sample as unknown as ReactPointerEvent);
      if (!point) continue;
      if (tool === 'eraser') setErased((current) => erase(current ?? items, point.x, point.y));
      else extend(point.x, point.y);
    }
  };

  const finish = (event: ReactPointerEvent<Element>) => {
    if (activeRef.current !== event.pointerId) return;
    activeRef.current = null;
    if (grabRef.current) {
      grabRef.current = null;
      return;
    }
    if (tool === 'eraser') {
      if (erased && erased !== items) commit(erased);
      setErased(null);
      return;
    }
    if (pointsRef.current.length >= 2) commit([...items, { type: 'stroke', color, width, points: pointsRef.current }]);
    pointsRef.current = [];
    setDraft(null);
  };

  const cancel = useCallback(() => {
    activeRef.current = null;
    grabRef.current = null;
    pointsRef.current = [];
    setDraft(null);
    setErased(null);
  }, []);

  return {
    cancel,
    visibleItems: erased ?? items,
    draft,
    handlers: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish },
  };
}
