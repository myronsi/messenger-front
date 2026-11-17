import type { SocketSender } from '@/shared/api/realtime';
import type { EntityId } from '@/shared/api/entityId';
import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { Message, ContextMenuState, elementCenter, hasOwnReaction, toggleReaction, useQuickReactions } from '@/entities/message';
import { ReactionEmoji } from '@/entities/emoji';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ReactionPicker } from './ReactionPicker';

interface ReactionMenuProps {
  reactionMenu: { message: Message; x: number; y: number; isClosing?: boolean };
  wsRef: React.MutableRefObject<SocketSender | null>;
  userId: EntityId;
  setReactionMenu: (value: { message: Message; x: number; y: number; isClosing?: boolean } | null) => void;
  onClose: () => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (value: ContextMenuState | null) => void;
  contextMenuRef?: React.RefObject<HTMLDivElement | null>;
}

const EDGE = 8;
const EXPAND = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

const ReactionMenu = forwardRef<HTMLDivElement, ReactionMenuProps>(
  ({ reactionMenu, wsRef, userId, setReactionMenu, onClose, contextMenu, setContextMenu, contextMenuRef }, ref) => {
    const [adjustedX, setAdjustedX] = useState(reactionMenu.x);
    const [adjustedY, setAdjustedY] = useState(reactionMenu.y);
    const [isAnimated, setIsAnimated] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerMounted, setPickerMounted] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const { translations } = useLanguage();
    const quick = useQuickReactions(userId);
    const message = reactionMenu.message;

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contextMenuRef?.current?.contains(event.target as Node)) return;
        if (ref && 'current' in ref && ref.current && !ref.current.contains(event.target as Node)) {
          setReactionMenu({ ...reactionMenu, isClosing: true });
          setContextMenu(contextMenu ? { ...contextMenu, isClosing: true } : null);
          setTimeout(() => onClose(), 200);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref, contextMenuRef, reactionMenu, contextMenu, onClose, setReactionMenu, setContextMenu]);

    useEffect(() => {
      if (!contextMenu && reactionMenu) {
        setReactionMenu({ ...reactionMenu, isClosing: true });
        setTimeout(() => onClose(), 200);
      }
    }, [contextMenu, reactionMenu, setReactionMenu, onClose]);

    useEffect(() => {
      const menu = contextMenuRef?.current;
      if (!menu || !pickerOpen) return undefined;
      menu.setAttribute('data-picker-dimmed', '');
      return () => menu.removeAttribute('data-picker-dimmed');
    }, [contextMenuRef, pickerOpen]);

    const openLeft = !!contextMenu?.openLeft;
    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const bar = ref.current;
        const rowHeight = rowRef.current?.offsetHeight ?? bar.offsetHeight;
        const fullHeight = bar.offsetHeight - (panelRef.current?.offsetHeight ?? 0) + (pickerOpen ? panelRef.current?.scrollHeight ?? 0 : 0);
        const left = openLeft ? reactionMenu.x - bar.offsetWidth : reactionMenu.x;
        const top = reactionMenu.y + rowHeight > window.innerHeight - EDGE ? reactionMenu.y - rowHeight : reactionMenu.y;
        setAdjustedX(Math.max(EDGE, Math.min(left, window.innerWidth - bar.offsetWidth - EDGE)));
        setAdjustedY(Math.max(EDGE, pickerOpen ? Math.min(top, window.innerHeight - EDGE - fullHeight) : top));
      }
    }, [reactionMenu.x, reactionMenu.y, openLeft, ref, pickerOpen]);

    useEffect(() => {
      if (!reactionMenu.isClosing) {
        setTimeout(() => setIsAnimated(true), 0);
      } else {
        setIsAnimated(false);
      }
    }, [reactionMenu.isClosing]);

    const relativeX = reactionMenu.x - adjustedX;
    const relativeY = reactionMenu.y - adjustedY;

    const handleReaction = (reaction: string, source?: Element) => {
      const origin = source ? elementCenter(source) : { x: reactionMenu.x, y: reactionMenu.y };
      if (!toggleReaction(wsRef.current, message, userId, reaction, origin)) console.error('Failed to send reaction over WebSocket');
      setReactionMenu({ ...reactionMenu, isClosing: true });
      setContextMenu(contextMenu ? { ...contextMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    const togglePicker = (event: React.MouseEvent) => {
      event.nativeEvent.stopPropagation();
      setPickerMounted(true);
      setPickerOpen((open) => !open);
    };

    const handleTransitionEnd = (event: React.TransitionEvent) => {
      if (reactionMenu.isClosing && event.propertyName === 'transform' && event.target === event.currentTarget) {
        onClose();
      }
    };

    return (
      <div
        ref={ref}
        data-testid="reaction-menu"
        className="fixed z-[51]"
        style={{
          top: adjustedY,
          left: adjustedX,
          transform: isAnimated ? 'scale(1)' : 'scale(0)',
          opacity: isAnimated ? 1 : 0,
          transition: `transform 0.2s, opacity 0.2s${pickerMounted ? `, top 0.3s ${EXPAND}` : ''}`,
          transformOrigin: `${relativeX}px ${relativeY}px`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="w-[18rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.4rem] border border-border/60 bg-popover shadow-lg">
          <div ref={rowRef} className="flex items-center justify-between px-1.5 py-1">
            {quick.map((reaction, index) => (
              <button
                key={reaction}
                type="button"
                aria-label={reaction}
                aria-pressed={hasOwnReaction(message.reactions, userId, reaction)}
                className={`motion-reaction-item flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none transition-transform hover:scale-125 active:scale-95 ${
                  hasOwnReaction(message.reactions, userId, reaction) ? 'bg-primary/15' : ''
                }`}
                style={{ animationDelay: `${index * 25}ms` }}
                onClick={(event) => handleReaction(reaction, event.currentTarget)}
              >
                <ReactionEmoji reaction={reaction} />
              </button>
            ))}
            <button type="button" aria-label={translations.customEmoji.moreReactions} aria-expanded={pickerOpen} onClick={togglePicker}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-[transform,background-color,color] duration-300 ${
                pickerOpen ? 'rotate-45 bg-accent text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${pickerOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            style={{ transitionTimingFunction: EXPAND }} aria-hidden={!pickerOpen} inert={!pickerOpen}>
            <div ref={panelRef} className="min-h-0 overflow-hidden">
              {pickerMounted && <ReactionPicker embedded onPick={(reaction) => handleReaction(reaction)} />}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReactionMenu.displayName = 'ReactionMenu';

export default ReactionMenu;
