import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, MicOff } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { cn } from '@/shared/lib/utils';
import type { Call } from '../api/callsApi';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { BUBBLE_RADIUS, bubbleBox, callViewStore, cornerPosition, maximizeCall, nearestCorner, placeCallBubble, type CallCorner } from '../model/callView';
import { useStore } from '../model/createStore';
import type { CallSession } from '../model/stores';
import type { VideoFeed } from '../model/videoStore';
import VideoView from './VideoView';
import { useCallAvatar, useCallTitle } from './callHooks';
import { useCallStatus } from './useCallStatus';

interface CallBubbleProps {
  call: Call | null;
  session: CallSession;
  userId: string | null;
  video?: VideoFeed | null;
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
    let frame = 0;
    const resize = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      });
    };
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return viewport;
};

const CallBubble: React.FC<CallBubbleProps> = ({ call, session, userId, video = null }) => {
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
  const button = useRef<HTMLButtonElement | null>(null);
  const home = cornerPosition(corner, viewport.width, viewport.height);
  const position = drag ?? home;
  const name = title || translations.callPanelTitle;
  const status = timer ?? (session.phase === 'rejoin' ? translations.callRejoin : phaseText);
  const statusColor = session.phase === 'rejoin' ? 'text-destructive' : timer ? 'font-semibold text-success' : 'text-warning';
  const label = [name, timer ?? phaseText, session.muted ? translations.callMuted : '', warning ? translations.callBubbleWarning : '', translations.callExpand]
    .filter(Boolean).join(' · ');

  useEffect(() => {
    const focused = document.activeElement;
    if (!focused || focused === document.body) button.current?.focus({ preventScroll: true });
  }, []);

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
      ref={button}
      type="button"
      aria-label={label}
      title={label}
      data-corner={corner}
      className={cn(
        'pointer-events-auto fixed z-[1040] flex touch-none select-none flex-col items-center gap-1 overflow-hidden border-2 bg-card px-2 shadow-2xl',
        video ? 'justify-end pb-2' : 'justify-center',
        'animate-in fade-in-0 zoom-in-75 duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary',
        session.phase === 'rejoin' ? 'border-destructive' : session.phase === 'connected' ? 'border-success' : 'border-warning',
        drag ? 'cursor-grabbing' : 'cursor-grab transition-[left,top] duration-200 ease-out motion-reduce:transition-none',
      )}
      style={{ left: position.left, top: position.top, width: bubbleBox.size, height: bubbleBox.size, borderRadius: BUBBLE_RADIUS }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        suppressClick.current = false;
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
      onPointerCancel={(event) => {
        start.current = null;
        latest.current = null;
        setDrag(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
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
      {video ? (
        <span aria-hidden="true" data-bubble-video="" className="pointer-events-none absolute inset-0">
          <VideoView feed={video} />
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        </span>
      ) : (
        <AuthenticatedImage src={avatar} initialsFrom={name} alt="" draggable={false}
          className="pointer-events-none h-12 w-12 shrink-0 rounded-full object-cover" />
      )}
      <span aria-hidden="true" className={cn('pointer-events-none relative max-w-full truncate text-xs font-semibold', video && 'text-white')}>
        <EmojiText text={name} />
      </span>
      <span aria-hidden="true" className={cn('pointer-events-none relative max-w-full truncate text-xs tabular-nums', statusColor)}>{status}</span>
      {session.muted && (
        <span aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground">
          <MicOff className="h-3 w-3" />
        </span>
      )}
      {warning && (
        <span aria-hidden="true" className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-warning p-1 text-warning-foreground">
          <AlertTriangle className="h-3 w-3" />
        </span>
      )}
    </button>
  );
};

export default CallBubble;
