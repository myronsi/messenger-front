import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { SheetGrip } from '@/shared/ui/SheetGrip';
import { keyboardInset } from '@/shared/lib/composerFocus';
import { DOCK_GAP } from '../model/dockLayout';

const CLOSE_PULL = 80;
const TAP_SLOP = 4;
const EXPANDED_RATIO = 0.75;

export const expandedPanelHeight = (baseHeight: number) => Math.max(baseHeight, Math.round(window.innerHeight * EXPANDED_RATIO));

export const settlePanelHeight = (height: number, baseHeight: number, expandedHeight: number) => {
  if (height < baseHeight - CLOSE_PULL) return null;
  return height > (baseHeight + expandedHeight) / 2 ? expandedHeight : baseHeight;
};

interface DockedEmojiPanelProps {
  baseHeight: number;
  onClose: () => void;
  leaving?: boolean;
  closing?: boolean;
  children: ReactNode;
}

const PANEL_MAX_HEIGHT = 'calc(var(--visual-viewport-height, 100dvh) - 160px)';
const SLOT_MAX_HEIGHT = `calc(var(--visual-viewport-height, 100dvh) - ${160 - DOCK_GAP}px)`;
const SETTLE_TRANSITION = 'height 0.2s ease-out';

export const DockedEmojiPanel = ({ baseHeight, onClose, leaving = false, closing = false, children }: DockedEmojiPanelProps) => {
  const { translations } = useLanguage();
  const [height, setHeight] = useState(baseHeight);
  const [settling, setSettling] = useState(false);
  const [entering, setEntering] = useState(() => keyboardInset() === 0);

  useEffect(() => {
    if (!entering) return undefined;
    const frame = requestAnimationFrame(() => {
      setSettling(true);
      setEntering(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [entering]);
  const heightRef = useRef(height);
  heightRef.current = height;
  const dragRef = useRef<{ startY: number; startHeight: number; height: number; moved: boolean } | null>(null);
  const expanded = height > baseHeight;

  const settle = (next: number | null) => {
    if (next === null) {
      onClose();
      return;
    }
    setSettling(next !== heightRef.current);
    setHeight(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { startY: event.clientY, startHeight: heightRef.current, height: heightRef.current, moved: false };
    setSettling(false);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = event.clientY - drag.startY;
    if (Math.abs(delta) > TAP_SLOP) drag.moved = true;
    if (!drag.moved) return;
    drag.height = Math.max(0, Math.min(expandedPanelHeight(baseHeight), drag.startHeight - delta));
    setHeight(drag.height);
  };
  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (!drag.moved) settle(expanded ? baseHeight : expandedPanelHeight(baseHeight));
    else settle(settlePanelHeight(drag.height, baseHeight, expandedPanelHeight(baseHeight)));
  };

  const transition = settling || closing ? SETTLE_TRANSITION : 'none';
  const slotHeight = entering || closing ? '0px' : `max(0px, calc(${height + DOCK_GAP}px - var(--keyboard-inset, 0px)))`;
  return (
    <div data-testid="emoji-sticker-keyboard-slot" aria-hidden={leaving || closing || undefined} className={`overflow-hidden ${leaving || closing ? 'pointer-events-none' : ''}`}
      style={{ height: slotHeight, maxHeight: SLOT_MAX_HEIGHT, transition }}
      onTransitionEnd={(event) => { if (event.target === event.currentTarget) setSettling(false); }}>
      <div data-testid="emoji-sticker-dock" className="flex h-full flex-col overflow-hidden rounded-2xl bg-popover"
        style={{ height, maxHeight: PANEL_MAX_HEIGHT, marginTop: DOCK_GAP, transition }}>
        <button type="button" aria-label={expanded ? translations.collapseEmojiPanel : translations.expandEmojiPanel} aria-expanded={expanded}
          data-testid="emoji-panel-handle" className="flex h-5 w-full shrink-0 touch-none items-center justify-center"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <SheetGrip />
        </button>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
};
