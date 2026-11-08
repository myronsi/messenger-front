import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, MicOff } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { cn } from '@/shared/lib/utils';
import type { Call } from '../api/callsApi';
import { bubbleBox, callViewStore, cornerPosition, maximizeCall, nearestCorner, placeCallBubble, type CallCorner } from '../model/callView';
import { useStore } from '../model/createStore';
import type { CallSession } from '../model/stores';
import { useCallAvatar, useCallTitle } from './callHooks';
import { useCallStatus } from './useCallStatus';

interface CallBubbleProps {
  call: Call | null;
  session: CallSession;
  userId: string | null;
}

interface DragStart {
  x: number;
  y: number;
  left: number;
  top: number;
  moved: boolean;
}

const DRAG_THRESHOLD = 6;
const clamp = (value: number, max: number) => Math.min(Math.max(0, value), Math.max(0, max));

const keyCorner = (corner: CallCorner, key: string): CallCorner | null => {
  const [vertical, horizontal] = corner.split('-');
  if (key === 'ArrowLeft') return `${vertical}-left` as CallCorner;
  if (key === 'ArrowRight') return `${vertical}-right` as CallCorner;
  if (key === 'ArrowUp') return `top-${horizontal}` as CallCorner;
  if (key === 'ArrowDown') return `bottom-${horizontal}` as CallCorner;
  return null;
};

const useViewport = () => {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return viewport;
};

const CallBubble: React.FC<CallBubbleProps> = ({ call, session, userId }) => {
  const { translations } = useLanguage();
  const { corner } = useStore(callViewStore);
  const viewport = useViewport();
  const { title } = useCallTitle(call, userId);
  const avatar = useCallAvatar(call, userId);
  const { phaseText, timer, warning } = useCallStatus(call, session);
  const [drag, setDrag] = useState<{ left: number; top: number } | null>(null);
  const start = useRef<DragStart | null>(null);
  const latest = useRef<{ left: number; top: number } | null>(null);
  const suppressClick = useRef(false);
  const home = cornerPosition(corner, viewport.width, viewport.height);
  const position = drag ?? home;
  const name = title || translations.callPanelTitle;
  const label = [name, timer ?? phaseText, session.muted ? translations.callMuted : '', warning ? translations.callBubbleWarning : '', translations.callExpand]
    .filter(Boolean).join(' · ');

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const begun = start.current;
    start.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!begun?.moved || !latest.current) return;
    suppressClick.current = true;
    const { left, top } = latest.current;
    placeCallBubble(nearestCorner(left + bubbleBox.size / 2, top + bubbleBox.size / 2, viewport.width, viewport.height));
    latest.current = null;
    setDrag(null);
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-corner={corner}
      className={cn(
        'pointer-events-auto fixed z-[1040] flex touch-none select-none items-center justify-center rounded-full bg-background shadow-2xl',
        'animate-in fade-in-0 zoom-in-50 duration-200',
        'ring-4 focus-visible:outline-none focus-visible:ring-primary',
        session.phase === 'rejoin' ? 'ring-red-500' : session.phase === 'connected' ? 'ring-emerald-500' : 'ring-amber-400',
        drag ? 'cursor-grabbing' : 'cursor-grab transition-[left,top] duration-200 ease-out motion-reduce:transition-none',
      )}
      style={{ left: position.left, top: position.top, width: bubbleBox.size, height: bubbleBox.size }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = { x: event.clientX, y: event.clientY, left: home.left, top: home.top, moved: false };
      }}
      onPointerMove={(event) => {
        const begun = start.current;
        if (!begun) return;
        const dx = event.clientX - begun.x, dy = event.clientY - begun.y;
        if (!begun.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        begun.moved = true;
        const next = {
          left: clamp(begun.left + dx, viewport.width - bubbleBox.size),
          top: clamp(begun.top + dy, viewport.height - bubbleBox.size),
        };
        latest.current = next;
        setDrag(next);
      }}
      onPointerUp={finishDrag}
      onPointerCancel={(event) => { start.current = null; latest.current = null; setDrag(null); finishDrag(event); }}
      onKeyDown={(event) => {
        const next = keyCorner(corner, event.key);
        if (!next) return;
        event.preventDefault();
        placeCallBubble(next);
      }}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        maximizeCall();
      }}
    >
      <AuthenticatedImage src={avatar} initialsFrom={name} alt="" draggable={false}
        className="pointer-events-none h-full w-full rounded-full object-cover" />
      {timer && (
        <span aria-hidden="true"
          className="pointer-events-none absolute -bottom-2 rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold tabular-nums leading-4 text-white">
          {timer}
        </span>
      )}
      {session.muted && (
        <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-1 rounded-full bg-slate-700 p-1 text-white">
          <MicOff className="h-3 w-3" />
        </span>
      )}
      {warning && (
        <span aria-hidden="true" className="pointer-events-none absolute -left-1 -top-1 rounded-full bg-amber-500 p-1 text-white">
          <AlertTriangle className="h-3 w-3" />
        </span>
      )}
    </button>
  );
};

export default CallBubble;
