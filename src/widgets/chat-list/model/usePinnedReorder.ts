import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { EntityId } from '@/shared/api/entityId';

export const REORDER_HOLD_MS = 450;
export const REORDER_SETTLE_MS = 200;
const SLOP = 6;
const TOUCH_SLOP = 12;

interface Press {
  id: EntityId;
  x: number;
  y: number;
  touch: boolean;
  armed: boolean;
  draggable: boolean;
  timer?: number;
}

interface Drag {
  id: EntityId;
  from: number;
  to: number;
  dy: number;
  height: number;
  middles: number[];
  settling?: boolean;
}

export const moveItem = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export const targetIndex = (middles: number[], from: number, center: number) => {
  let to = from;
  middles.forEach((middle, index) => {
    if (index < from && center < middle) to = Math.min(to, index);
    if (index > from && center > middle) to = Math.max(to, index);
  });
  return to;
};

interface PinnedReorderOptions {
  pinnedIds: EntityId[];
  onCommit: (ids: EntityId[]) => void;
  onHold: (id: EntityId, x: number, y: number) => void;
  onDragStart: () => void;
}

export const usePinnedReorder = ({ pinnedIds, onCommit, onHold, onDragStart }: PinnedReorderOptions) => {
  const rows = useRef(new Map<EntityId, HTMLElement>());
  const press = useRef<Press | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const lastTouch = useRef(false);
  const held = useRef<EntityId | null>(null);
  const detach = useRef<(() => void) | null>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  const [snapping, setSnapping] = useState(false);
  const settleTimer = useRef<number | undefined>(undefined);
  const latest = useRef({ pinnedIds, onCommit, onHold, onDragStart });
  latest.current = { pinnedIds, onCommit, onHold, onDragStart };

  const setDrag = (next: Drag | null) => {
    if (next && dragRef.current && !next.settling && next.to !== dragRef.current.to) navigator.vibrate?.(5);
    dragRef.current = next;
    setDragState(next);
  };

  const end = () => {
    if (press.current?.timer) window.clearTimeout(press.current.timer);
    press.current = null;
    detach.current?.();
    detach.current = null;
  };

  useEffect(() => {
    const block = (event: TouchEvent) => {
      if (dragRef.current || (press.current?.armed && press.current.draggable && press.current.touch)) event.preventDefault();
    };
    document.addEventListener('touchmove', block, { passive: false });
    return () => {
      document.removeEventListener('touchmove', block);
      detach.current?.();
      window.clearTimeout(settleTimer.current);
    };
  }, []);

  const begin = (current: Press, dy: number) => {
    const ids = latest.current.pinnedIds;
    const from = ids.indexOf(current.id);
    const middles = ids.map((id) => {
      const rect = rows.current.get(id)?.getBoundingClientRect();
      return rect ? rect.top + rect.height / 2 : 0;
    });
    const height = rows.current.get(current.id)?.getBoundingClientRect().height ?? 0;
    suppressClick.current = true;
    latest.current.onDragStart();
    setDrag({ id: current.id, from, to: targetIndex(middles, from, middles[from] + dy), dy, height, middles });
  };

  const onMove = (event: PointerEvent) => {
    const current = press.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    const active = dragRef.current;
    if (active?.settling) return;
    if (active) {
      setDrag({ ...active, dy, to: targetIndex(active.middles, active.from, active.middles[active.from] + dy) });
      return;
    }
    if (!current.armed) {
      if (Math.hypot(dx, dy) > (current.touch ? TOUCH_SLOP : SLOP)) end();
      return;
    }
    if (current.draggable && Math.abs(dy) > SLOP) {
      if (current.timer) window.clearTimeout(current.timer);
      begin(current, dy);
    }
  };

  const onUp = () => {
    const active = dragRef.current;
    end();
    if (!active || active.settling) return;
    setDrag({ ...active, dy: active.middles[active.to] - active.middles[active.from], settling: true });
    settleTimer.current = window.setTimeout(() => {
      setSnapping(true);
      setDrag(null);
      if (active.from !== active.to) latest.current.onCommit(moveItem(latest.current.pinnedIds, active.from, active.to));
      requestAnimationFrame(() => requestAnimationFrame(() => setSnapping(false)));
    }, REORDER_SETTLE_MS);
  };

  const onCancel = () => {
    end();
    if (dragRef.current && !dragRef.current.settling) setDrag(null);
  };

  const hold = (id: EntityId, x: number, y: number) => {
    if (held.current === id) return;
    held.current = id;
    suppressClick.current = true;
    navigator.vibrate?.(15);
    latest.current.onHold(id, x, y);
  };

  const bind = (id: EntityId) => ({
    ref: (element: HTMLElement | null) => {
      if (element) rows.current.set(id, element);
      else rows.current.delete(id);
    },
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (dragRef.current?.settling) return;
      end();
      const touch = event.pointerType !== 'mouse';
      lastTouch.current = touch;
      held.current = null;
      const draggable = latest.current.pinnedIds.includes(id) && latest.current.pinnedIds.length > 1;
      const current: Press = { id, x: event.clientX, y: event.clientY, touch, armed: !touch, draggable };
      if (touch) {
        current.timer = window.setTimeout(() => {
          current.armed = true;
          hold(id, current.x, current.y);
        }, REORDER_HOLD_MS);
      }
      press.current = current;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      detach.current = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
      };
    },
    onContextMenu: (event: MouseEvent) => {
      if (!lastTouch.current) return;
      event.preventDefault();
      const current = press.current;
      if (current?.id === id) {
        if (current.timer) window.clearTimeout(current.timer);
        current.armed = true;
      }
      hold(id, event.clientX, event.clientY);
    },
    onClickCapture: (event: MouseEvent) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  });

  const offsetOf = (id: EntityId) => {
    if (!drag) return 0;
    if (id === drag.id) return drag.dy;
    const index = pinnedIds.indexOf(id);
    if (index < 0) return 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -drag.height;
    if (drag.from > drag.to && index >= drag.to && index < drag.from) return drag.height;
    return 0;
  };

  return { bind, offsetOf, draggingId: drag?.id ?? null, isSettling: !!drag?.settling, isSnapping: snapping };
};
