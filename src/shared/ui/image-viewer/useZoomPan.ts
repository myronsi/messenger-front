import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { IDENTITY, panBy, wheelZoomFactor, zoomAt, clampZoomPan, type Size, type ZoomPan } from './zoomPan';

interface Point { x: number; y: number }
interface Measure { stage: Size; image: Size; rect: DOMRect }

type Gesture =
  | { type: 'pan'; last: Point }
  | { type: 'pinch'; startDistance: number; startScale: number; lastMid: Point };

const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 6;
const SWIPE_DISTANCE = 60;
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

interface ZoomPanOptions { onSwipe?: (direction: -1 | 1) => void }

export const useZoomPan = (
  stageRef: RefObject<HTMLElement | null>, imageRef: RefObject<HTMLElement | null>, enabled: boolean, { onSwipe }: ZoomPanOptions = {},
) => {
  const [view, setView] = useState<ZoomPan>(IDENTITY);
  const [swipeX, setSwipeX] = useState(0);
  const swipeRef = useRef({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const viewRef = useRef<ZoomPan>(IDENTITY);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const startRef = useRef<Point | null>(null);
  const movedRef = useRef(false);
  const lastTapRef = useRef<{ at: number; point: Point } | null>(null);

  const measure = useCallback((): Measure | null => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image) return null;
    return {
      stage: { width: stage.clientWidth, height: stage.clientHeight },
      image: { width: image.offsetWidth, height: image.offsetHeight },
      rect: stage.getBoundingClientRect(),
    };
  }, [stageRef, imageRef]);

  const update = useCallback((next: (current: ZoomPan, m: Measure) => ZoomPan) => {
    const m = measure();
    if (!m) return;
    viewRef.current = next(viewRef.current, m);
    setView(viewRef.current);
  }, [measure]);

  const toStage = (point: Point, rect: DOMRect) => ({ x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 });

  const reset = useCallback(() => {
    viewRef.current = IDENTITY;
    setView(IDENTITY);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    update((current, m) => zoomAt(current, current.scale * factor, { x: 0, y: 0 }, m.image, m.stage));
  }, [update]);

  const pan = useCallback((dx: number, dy: number) => {
    update((current, m) => panBy(current, dx, dy, m.image, m.stage));
  }, [update]);

  const toggleAt = useCallback((client: Point) => {
    update((current, m) => (current.scale > 1
      ? clampZoomPan(IDENTITY, m.image, m.stage)
      : zoomAt(current, 2.5, toStage(client, m.rect), m.image, m.stage)));
  }, [update]);

  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!enabled || !stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      update((current, m) => zoomAt(
        current, current.scale * wheelZoomFactor(event.deltaY, event.deltaMode),
        toStage({ x: event.clientX, y: event.clientY }, m.rect), m.image, m.stage,
      ));
    };
    const onResize = () => update((current, m) => clampZoomPan(current, m.image, m.stage));
    stage.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);
    return () => {
      stage.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled, stageRef, update]);

  const startGesture = () => {
    const points = [...pointersRef.current.values()];
    swipeRef.current = { x: 0, y: 0 };
    setSwipeX(0);
    if (points.length >= 2) {
      gestureRef.current = {
        type: 'pinch', startDistance: Math.max(1, distance(points[0], points[1])),
        startScale: viewRef.current.scale, lastMid: midpoint(points[0], points[1]),
      };
    } else if (points.length === 1) {
      gestureRef.current = { type: 'pan', last: points[0] };
    } else {
      gestureRef.current = null;
    }
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
    }
    const point = { x: event.clientX, y: event.clientY };
    if (pointersRef.current.size === 0) {
      movedRef.current = false;
      startRef.current = point;
    }
    pointersRef.current.set(event.pointerId, point);
    setIsGesturing(true);
    startGesture();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    if (startRef.current && distance(point, startRef.current) > TAP_SLOP) movedRef.current = true;
    const gesture = gestureRef.current;
    if (gesture?.type === 'pinch') {
      const [a, b] = [...pointersRef.current.values()];
      if (!a || !b) return;
      const mid = midpoint(a, b);
      const { lastMid } = gesture;
      gesture.lastMid = mid;
      update((current, m) => {
        const zoomed = zoomAt(current, gesture.startScale * (distance(a, b) / gesture.startDistance), toStage(mid, m.rect), m.image, m.stage);
        return panBy(zoomed, mid.x - lastMid.x, mid.y - lastMid.y, m.image, m.stage);
      });
    } else if (gesture?.type === 'pan') {
      const { last } = gesture;
      gesture.last = point;
      if (viewRef.current.scale > 1) pan(point.x - last.x, point.y - last.y);
      else if (onSwipe && startRef.current) {
        swipeRef.current = { x: point.x - startRef.current.x, y: point.y - startRef.current.y };
        setSwipeX(Math.abs(swipeRef.current.x) > Math.abs(swipeRef.current.y) ? swipeRef.current.x : 0);
      }
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (!pointersRef.current.delete(event.pointerId)) return;
    const swipe = swipeRef.current;
    if (pointersRef.current.size > 0) {
      startRef.current = [...pointersRef.current.values()][0];
      startGesture();
      return;
    }
    gestureRef.current = null;
    swipeRef.current = { x: 0, y: 0 };
    setSwipeX(0);
    setIsGesturing(false);
    if (onSwipe && Math.abs(swipe.x) > SWIPE_DISTANCE && Math.abs(swipe.x) > Math.abs(swipe.y) * 1.2) {
      onSwipe(swipe.x < 0 ? 1 : -1);
      return;
    }
    if (movedRef.current) return;
    const point = { x: event.clientX, y: event.clientY };
    const lastTap = lastTapRef.current;
    if (lastTap && event.timeStamp - lastTap.at < DOUBLE_TAP_MS && distance(point, lastTap.point) < TAP_SLOP * 4) {
      lastTapRef.current = null;
      toggleAt(point);
    } else {
      lastTapRef.current = { at: event.timeStamp, point };
    }
  };

  return {
    view, swipeX, isGesturing, movedRef, reset, zoomBy, pan, toggleAt,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
};
