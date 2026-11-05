import { useRef, useState, type PointerEvent, type MouseEvent } from 'react';

export function useSwipeTabs<T extends string>(active: T, tabs: T[], select: (tab: T) => void, enabled = true) {
  const gesture = useRef<{ x: number; y: number; dx: number; axis: 'x' | 'y' | null; pointerId: number } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const releaseRef = useRef<{ from: T; dx: number } | null>(null);
  return {
    offset, dragging, releaseRef,
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (gesture.current) { gesture.current = null; setOffset(0); setDragging(false); return; }
      suppressClick.current = false;
      gesture.current = null;
      setOffset(0);
      setDragging(false);
      const target = event.target instanceof Element ? event.target : null;
      if (!enabled || tabs.length < 2 || !target || !event.currentTarget.contains(target)) return;
      if (target.closest('input, textarea, select, audio, video, [role="slider"], [data-swipe-ignore]')) return;
      if (target.closest('[role="dialog"], [role="alertdialog"]') !== event.currentTarget.closest('[role="dialog"], [role="alertdialog"]')) return;
      gesture.current = { x: event.clientX, y: event.clientY, dx: 0, axis: null, pointerId: event.pointerId };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!current.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 12) {
        current.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
      }
      current.dx = dx;
      if (current.axis === 'x') {
        event.preventDefault();
        try { event.currentTarget.setPointerCapture?.(event.pointerId); }
        catch (error) { if (!(error instanceof DOMException)) throw error; }
        const index = tabs.indexOf(active);
        const atEdge = (dx > 0 && index <= 0) || (dx < 0 && index >= tabs.length - 1);
        setOffset(atEdge ? dx * 0.25 : dx);
        setDragging(true);
      }
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      gesture.current = null;
      setOffset(0);
      setDragging(false);
      if (current?.axis === 'x' && Math.abs(current.dx) >= 12) suppressClick.current = true;
      if (!enabled || current?.axis !== 'x' || Math.abs(current.dx) < 70) return;
      suppressClick.current = true;
      const index = tabs.indexOf(active);
      if (index < 0) return;
      const next = tabs[index + (current.dx < 0 ? 1 : -1)];
      if (next) { releaseRef.current = { from: active, dx: current.dx }; select(next); }
    },
    onPointerCancel() { gesture.current = null; setOffset(0); setDragging(false); },
    onClickCapture(event: MouseEvent) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
