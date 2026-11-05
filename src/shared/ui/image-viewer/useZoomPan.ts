import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { mobileImageDirection } from './mobileImageDirection';
import { IDENTITY, panBy, pinchTo, wheelZoomFactor, zoomAt, clampZoomPan, type Size, type ZoomPan } from './zoomPan';

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

interface ZoomPanOptions {
  onSwipe?: (direction: -1 | 1, displacement: number) => void;
  onDismiss?: (displacement: number) => void;
}

export const useZoomPan = (
  stageRef: RefObject<HTMLElement | null>, imageRef: RefObject<HTMLElement | null>, enabled: boolean, { onSwipe, onDismiss }: ZoomPanOptions = {},
) => {
  const [view, setView] = useState<ZoomPan>(IDENTITY);
  const [swipeX, setSwipeX] = useState(0);
  const [swipeY, setSwipeY] = useState(0);
  const swipeRef = useRef({ x: 0, y: 0 });
  const swipeAxis = useRef<'horizontal' | 'vertical' | null>(null);
  const [isGesturing, setIsGesturing] = useState(false);
  const viewRef = useRef<ZoomPan>(IDENTITY);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchedRef = useRef(false);
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
    swipeAxis.current = null;
    const points = [...pointersRef.current.values()];
    swipeRef.current = { x: 0, y: 0 };
    setSwipeX(0);
    setSwipeY(0);
    if (points.length >= 2) {
      pinchedRef.current = true;
      movedRef.current = true;
      lastTapRef.current = null;
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
      pinchedRef.current = false;
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
      update((current, m) => pinchTo(
        current, gesture.startScale * (distance(a, b) / gesture.startDistance), toStage(lastMid, m.rect), toStage(mid, m.rect), m.image, m.stage,
      ));
    } else if (gesture?.type === 'pan') {
      const { last } = gesture;
      gesture.last = point;
      if (viewRef.current.scale > 1) pan(point.x - last.x, point.y - last.y);
      else if (!pinchedRef.current && (onSwipe || onDismiss) && startRef.current) {
        swipeRef.current = { x: point.x - startRef.current.x, y: point.y - startRef.current.y };
        const { x, y } = swipeRef.current;
        if (!swipeAxis.current && Math.max(Math.abs(x), Math.abs(y)) > 10) {
          if (Math.abs(x) > Math.abs(y) * 1.2) swipeAxis.current = 'horizontal';
          else if (Math.abs(y) > Math.abs(x) * 1.2) swipeAxis.current = 'vertical';
        }
        setSwipeX(onSwipe && swipeAxis.current === 'horizontal' ? x : 0);
        setSwipeY(onDismiss && swipeAxis.current === 'vertical' ? Math.max(0, y) : 0);
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
    if (pinchedRef.current) {
      setSwipeY(0);
      lastTapRef.current = null;
      return;
    }
    const dismiss = event.type !== 'pointercancel' && onDismiss && viewRef.current.scale === 1 && swipeAxis.current === 'vertical' && swipe.y > 100;
    if (dismiss) {
      onDismiss(swipe.y);
      return;
    }
    setSwipeY(0);
    if (event.type === 'pointercancel') return;
    if (onSwipe && swipeAxis.current === 'horizontal' && Math.abs(swipe.x) > SWIPE_DISTANCE) {
      onSwipe(swipe.x < 0 ? 1 : -1, swipe.x);
      return;
    }
    if (movedRef.current) return;
    if (onSwipe && mobileImageDirection(event.clientX, stageRef.current)) { lastTapRef.current = null; return; }
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
    view, swipeX, swipeY, isGesturing, movedRef, reset, zoomBy, pan, toggleAt,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
};
