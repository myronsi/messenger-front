import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

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
  children: ReactNode;
}

export const DockedEmojiPanel = ({ baseHeight, onClose, children }: DockedEmojiPanelProps) => {
  const { translations } = useLanguage();
  const [height, setHeight] = useState(baseHeight);
  const [dragging, setDragging] = useState(false);
  const heightRef = useRef(height);
  heightRef.current = height;
  const dragRef = useRef<{ startY: number; startHeight: number; height: number; moved: boolean } | null>(null);
  const expanded = height > baseHeight;

  const settle = (next: number | null) => {
    if (next === null) onClose();
    else setHeight(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { startY: event.clientY, startHeight: heightRef.current, height: heightRef.current, moved: false };
    setDragging(true);
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
    setDragging(false);
    if (!drag) return;
    if (!drag.moved) settle(expanded ? baseHeight : expandedPanelHeight(baseHeight));
    else settle(settlePanelHeight(drag.height, baseHeight, expandedPanelHeight(baseHeight)));
  };

  return (
    <div data-testid="emoji-sticker-dock" className="flex flex-col overflow-hidden rounded-2xl bg-popover"
      style={{ height, maxHeight: 'calc(var(--visual-viewport-height, 100dvh) - 160px)', transition: dragging ? 'none' : 'height 0.2s ease-out' }}>
      <button type="button" aria-label={expanded ? translations.collapseEmojiPanel : translations.expandEmojiPanel} aria-expanded={expanded}
        data-testid="emoji-panel-handle" className="flex h-5 w-full shrink-0 touch-none items-center justify-center"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
      </button>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
};
