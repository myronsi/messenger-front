import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReactionInfo } from '../model/types';
import { ReactionGroup, groupAndSortReactions, splitVisibleReactions } from '../model/reactions';
import type { Id } from '@/shared/lib/ids';

interface ReactionListProps {
  reactions: ReactionInfo[];
  messageId: Id;
  userId: Id;
  isMine: boolean;
  /** Image bubbles keep their time badge inside the image, so the strip overlaps the bubble less. */
  isImage?: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onOpenReactionDetails?: (reaction: string, reactions: ReactionInfo[]) => void;
}

const HOVER_CLOSE_DELAY_MS = 150;
const POPOVER_GAP_PX = 6;
const VIEWPORT_MARGIN_PX = 8;

interface PopoverPosition {
  top: number;
  left: number;
}

const ReactionList: React.FC<ReactionListProps> = ({
  reactions,
  messageId,
  userId,
  isMine,
  isImage = false,
  wsRef,
  onOpenReactionDetails,
}) => {
  // Same ordering for one-on-one and group chats: count desc, then most recently added first.
  const { visible, hidden } = useMemo(
    () => splitVisibleReactions(groupAndSortReactions(reactions)),
    [reactions]
  );

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Opened by a click/tap (or keyboard): stays open until dismissed. Opened by hover: closes on mouse leave.
  const pinnedRef = useRef(false);

  const isMineReaction = (group: ReactionGroup) => group.users.some((item) => item.user_id === userId);
  const hiddenHasMine = hidden.some(isMineReaction);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeOverflow = useCallback(() => {
    clearCloseTimer();
    pinnedRef.current = false;
    setOverflowOpen(false);
  }, [clearCloseTimer]);

  const scheduleHoverClose = () => {
    if (pinnedRef.current) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(closeOverflow, HOVER_CLOSE_DELAY_MS);
  };

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  // Nothing left to show in the overflow (e.g. someone removed a reaction): close it.
  useEffect(() => {
    if (hidden.length === 0) closeOverflow();
  }, [hidden.length, closeOverflow]);

  // Place the popover under the "+N" chip (flip above when there is no room), kept inside the viewport.
  useLayoutEffect(() => {
    if (!overflowOpen || !triggerRef.current || !popoverRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const popover = popoverRef.current.getBoundingClientRect();

    let left = isMine ? trigger.right - popover.width : trigger.left;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN_PX), window.innerWidth - popover.width - VIEWPORT_MARGIN_PX);

    let top = trigger.bottom + POPOVER_GAP_PX;
    if (top + popover.height > window.innerHeight - VIEWPORT_MARGIN_PX) {
      top = Math.max(VIEWPORT_MARGIN_PX, trigger.top - popover.height - POPOVER_GAP_PX);
    }
    setPopoverPosition((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
  }, [overflowOpen, isMine, hidden.length]);

  useEffect(() => {
    if (!overflowOpen) setPopoverPosition(null);
  }, [overflowOpen]);

  // Dismiss on outside press, Escape, scroll or resize.
  useEffect(() => {
    if (!overflowOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closeOverflow();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverflow();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeOverflow, true);
    window.addEventListener('resize', closeOverflow);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeOverflow, true);
      window.removeEventListener('resize', closeOverflow);
    };
  }, [overflowOpen, closeOverflow]);

  const toggleReaction = (reaction: string) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const hasReaction = reactions.some((item) => item.user_id === userId && item.reaction === reaction);
    socket.send(
      JSON.stringify({
        type: hasReaction ? 'reaction_remove' : 'reaction_add',
        message_id: messageId,
        reaction,
      })
    );
  };

  const detailHandlers = (group: ReactionGroup) => ({
    onDoubleClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      onOpenReactionDetails?.(group.reaction, group.users);
    },
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onOpenReactionDetails?.(group.reaction, group.users);
    },
  });

  const handleOverflowClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    clearCloseTimer();
    if (overflowOpen && pinnedRef.current) {
      closeOverflow();
    } else {
      pinnedRef.current = true;
      setOverflowOpen(true);
    }
  };

  const handleOverflowPointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return; // touch has no hover: it opens on tap
    clearCloseTimer();
    setOverflowOpen(true);
  };

  const handleOverflowPointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    scheduleHoverClose();
  };

  return (
    <div
      className={`pointer-events-auto absolute top-full z-10 ${isImage ? '-mt-1' : '-mt-1.5'} ${
        isMine ? 'right-2' : 'left-2'
      }`}
      data-testid="reaction-strip"
    >
      <div className="inline-flex h-5 items-center gap-0.5 whitespace-nowrap rounded-full border border-border/70 bg-background px-0.5 text-foreground shadow-sm">
        {visible.map((group) => {
          const mine = isMineReaction(group);
          return (
            <button
              key={`${group.reaction}-${group.count}`}
              type="button"
              data-reaction={group.reaction}
              aria-pressed={mine}
              className={`motion-reaction-pop inline-flex h-4 cursor-pointer select-none items-center gap-0.5 rounded-full px-1 text-[13px] leading-none transition-colors hover:bg-accent ${
                mine ? 'bg-primary/15 ring-1 ring-primary/60' : ''
              }`}
              title="Click to toggle. Right-click to view people."
              onClick={(event) => {
                event.stopPropagation();
                toggleReaction(group.reaction);
              }}
              {...detailHandlers(group)}
            >
              <span>{group.reaction}</span>
              {group.count > 1 && (
                <span className="text-[11px] font-medium tabular-nums text-foreground/80">{group.count}</span>
              )}
            </button>
          );
        })}
        {hidden.length > 0 && (
          <button
            ref={triggerRef}
            type="button"
            data-testid="reaction-overflow"
            aria-haspopup="dialog"
            aria-expanded={overflowOpen}
            aria-label={`${hidden.length} more reactions`}
            className={`inline-flex h-4 cursor-pointer select-none items-center rounded-full px-1 text-[11px] font-semibold leading-none text-muted-foreground transition-colors hover:bg-accent ${
              hiddenHasMine ? 'bg-primary/15 ring-1 ring-primary/60' : ''
            }`}
            onClick={handleOverflowClick}
            onPointerEnter={handleOverflowPointerEnter}
            onPointerLeave={handleOverflowPointerLeave}
          >
            +{hidden.length}
          </button>
        )}
      </div>

      {overflowOpen &&
        hidden.length > 0 &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="More reactions"
            data-testid="reaction-overflow-popover"
            className="fixed z-50 flex max-w-[14rem] flex-wrap gap-1 rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
            style={{
              top: popoverPosition?.top ?? 0,
              left: popoverPosition?.left ?? 0,
              // Measured first (invisible), then shown at its computed position.
              visibility: popoverPosition ? 'visible' : 'hidden',
            }}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') clearCloseTimer();
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse') scheduleHoverClose();
            }}
            // Portal events bubble through the React tree to the message row; keep them local.
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.stopPropagation()}
          >
            {hidden.map((group) => {
              const mine = isMineReaction(group);
              return (
                <button
                  key={group.reaction}
                  type="button"
                  data-reaction={group.reaction}
                  aria-pressed={mine}
                  title={mine ? 'You reacted. Click to remove.' : 'Click to react.'}
                  className={`inline-flex h-7 cursor-pointer select-none items-center gap-1 rounded-full px-2 text-base leading-none transition-colors hover:bg-accent ${
                    mine ? 'bg-primary/15 ring-1 ring-primary/60' : ''
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleReaction(group.reaction);
                    closeOverflow();
                  }}
                  {...detailHandlers(group)}
                >
                  <span>{group.reaction}</span>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">{group.count}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export default ReactionList;
