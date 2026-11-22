import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { X } from 'lucide-react';
import type { PinnedMessage } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { PinnedRow } from './PinnedRow';

interface PinnedMessagesPanelProps {
  open?: boolean;
  chatId: EntityId;
  pins: PinnedMessage[];
  count: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  belowBar: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onJump: (messageId: EntityId) => void;
  onClose: () => void;
}

export const SHEET_CLOSE_DRAG_PX = 90;
export const PINNED_PANEL_EXIT_MS = 240;

interface ShellProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

const CloseButton = ({ label, onClose }: { label: string; onClose: () => void }) => (
  <button type="button" onClick={onClose} aria-label={label} className="motion-press flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
    <X className="h-4 w-4" />
  </button>
);

const PinnedSheet = ({ open, title, closeLabel, hint, onClose, children }: ShellProps & { hint: string }) => {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const onTouchStart = (event: TouchEvent) => { start.current = event.touches[0]?.clientY ?? null; };
  const onTouchMove = (event: TouchEvent) => {
    if (start.current === null || !event.touches[0]) return;
    setDrag(Math.max(0, event.touches[0].clientY - start.current));
  };
  const onTouchEnd = () => {
    start.current = null;
    if (drag > SHEET_CLOSE_DRAG_PX) onClose();
    else setDrag(0);
  };
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent hideClose aria-describedby={undefined} onOpenAutoFocus={(event) => event.preventDefault()}
        style={drag ? { translate: `0 ${drag}px` } : undefined}
        className={cn('pinned-sheet bottom-0 left-0 right-0 top-auto flex max-h-[75dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-b-none',
          'rounded-t-[24px] border-x-0 border-b-0 border-t border-border/60 bg-background/80 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl sm:rounded-b-none sm:rounded-t-[24px]',
          !drag && 'transition-[translate] duration-200')}>
        <div data-testid="pinned-sheet-handle" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
          className="shrink-0 touch-none px-4 pb-1 pt-2">
          <div aria-hidden="true" className="mx-auto mb-2 h-1 w-9 rounded-full bg-muted-foreground/40" />
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            <CloseButton label={closeLabel} onClose={onClose} />
          </div>
        </div>
        <div data-testid="pinned-panel" className="min-h-0 flex-1 overflow-y-auto px-2">{children}</div>
        <p className="shrink-0 px-4 py-2 text-center text-xs text-muted-foreground">{hint}</p>
      </DialogContent>
    </Dialog>
  );
};

const PinnedDropdown = ({ open, title, closeLabel, belowBar, onClose, children }: ShellProps & { belowBar: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const onDown = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (ref.current?.contains(target) || target?.closest('[data-testid="pinned-bar"]') || target?.closest('[role="dialog"]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose]);
  return (
    <div className="pointer-events-none relative z-40 h-0">
      <div ref={ref} role="region" aria-label={title} data-testid="pinned-dropdown"
        className={cn('pinned-dropdown', open ? 'pointer-events-auto' : 'is-closing pointer-events-none',
          'absolute left-2 right-2 flex max-h-[min(60vh,28rem)] flex-col rounded-[24px] border border-border/60',
          'bg-background/80 shadow-lg backdrop-blur-2xl md:left-[16.67%] md:right-[16.67%]', belowBar ? 'top-[3.75rem]' : 'top-2')}>
        <div className="flex shrink-0 items-center justify-between pb-1 pl-4 pr-2 pt-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          <CloseButton label={closeLabel} onClose={onClose} />
        </div>
        <div data-testid="pinned-panel" className="min-h-0 overflow-y-auto px-2 pb-2">{children}</div>
      </div>
    </div>
  );
};

export const PinnedMessagesPanel = ({
  open = true, chatId, pins, count, hasMore, isLoadingMore, isError, belowBar, onLoadMore, onRetry, onJump, onClose,
}: PinnedMessagesPanelProps) => {
  const { translations } = useLanguage();
  const t = translations.messagePins;
  const isMobile = useIsMobile();
  const total = Math.max(count, pins.length);
  const title = total > 0 ? fillTemplate(t.pinnedCount, { count: hasMore && total <= pins.length ? `${total}+` : String(total) }) : t.pinnedMessages;
  const body = (
    <>
      {isError && !pins.length && (
        <button type="button" onClick={onRetry} className="w-full py-6 text-center text-sm text-muted-foreground hover:text-foreground">{t.loadFailed}</button>
      )}
      {!isError && !pins.length && <p className="py-6 text-center text-sm text-muted-foreground">{t.empty}</p>}
      {pins.map((pin) => <PinnedRow key={String(pin.message.id)} chatId={chatId} pin={pin} swipeToUnpin={isMobile} onJump={onJump} />)}
      {hasMore && (
        <button type="button" onClick={onLoadMore} disabled={isLoadingMore}
          className="w-full rounded-xl py-2 text-sm text-primary transition-colors hover:bg-accent disabled:opacity-50">
          {t.loadMore}
        </button>
      )}
    </>
  );
  return isMobile
    ? <PinnedSheet open={open} title={title} closeLabel={t.closePinned} hint={t.swipeToUnpin} onClose={onClose}>{body}</PinnedSheet>
    : <PinnedDropdown open={open} title={title} closeLabel={t.closePinned} belowBar={belowBar} onClose={onClose}>{body}</PinnedDropdown>;
};
