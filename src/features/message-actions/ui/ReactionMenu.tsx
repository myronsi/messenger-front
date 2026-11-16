import type { SocketSender } from '@/shared/api/realtime';
import type { EntityId } from '@/shared/api/entityId';
import React, { forwardRef, useState, useEffect } from 'react';
import { Message, ContextMenuState } from '@/entities/message';
import { ReactionEmoji, useRecentEmoji } from '@/entities/emoji';
import { BASE_REACTIONS, recentCustomReactions } from '../model/customReactions';
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

const ReactionMenu = forwardRef<HTMLDivElement, ReactionMenuProps>(
  ({ reactionMenu, wsRef, userId, setReactionMenu, onClose, contextMenu, setContextMenu, contextMenuRef }, ref) => {
    const [adjustedX, setAdjustedX] = useState(reactionMenu.x);
    const [adjustedY, setAdjustedY] = useState(reactionMenu.y);
    const [isAnimated, setIsAnimated] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const { translations } = useLanguage();
    const reactions = [...BASE_REACTIONS, ...recentCustomReactions(useRecentEmoji())];

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        // Pressing a context-menu button must not start the closing animation before the click lands
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

    // Close ReactionMenu if ContextMenu is closed
    useEffect(() => {
      if (!contextMenu && reactionMenu) {
        setReactionMenu({ ...reactionMenu, isClosing: true });
        setTimeout(() => onClose(), 200);
      }
    }, [contextMenu, reactionMenu, setReactionMenu, onClose]);

    const openLeft = !!contextMenu?.openLeft;
    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const bar = ref.current;
        const left = openLeft ? reactionMenu.x - bar.offsetWidth : reactionMenu.x;
        const top = reactionMenu.y + bar.offsetHeight > window.innerHeight - EDGE ? reactionMenu.y - bar.offsetHeight : reactionMenu.y;
        setAdjustedX(Math.max(EDGE, Math.min(left, window.innerWidth - bar.offsetWidth - EDGE)));
        setAdjustedY(Math.max(EDGE, top));
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

    const handleReaction = (reaction: string) => {
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          const message = reactionMenu.message;
          const hasReaction = message.reactions?.some((r) => r.user_id === userId && r.reaction === reaction);
          const payload = {
            type: hasReaction ? 'reaction_remove' : 'reaction_add',
            message_id: message.id,
            reaction,
          };
          try {
            wsRef.current.send(JSON.stringify(payload));
          } catch (error) {
            console.error('Failed to send reaction over WebSocket');
          }
        } else {
          console.error('WebSocket is not open, current state:', wsRef.current.readyState);
        }
      } else {
        console.error('WebSocket reference is null');
      }
      setReactionMenu({ ...reactionMenu, isClosing: true });
      setContextMenu(contextMenu ? { ...contextMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    const handleTransitionEnd = (event: React.TransitionEvent) => {
      if (reactionMenu.isClosing && event.propertyName === 'transform') {
        onClose();
      }
    };

    return (
      <div
        ref={ref}
        className="fixed z-50 flex flex-col items-center gap-2"
        style={{
          top: adjustedY,
          left: adjustedX,
          transform: isAnimated ? 'scale(1)' : 'scale(0)',
          opacity: isAnimated ? 1 : 0,
          transition: 'transform 0.2s, opacity 0.2s',
          transformOrigin: `${relativeX}px ${relativeY}px`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="flex space-x-2 p-1 bg-background rounded-full shadow-lg">
          {reactions.map((reaction) => (
            <button
              key={reaction}
              className="text-2xl hover:scale-110 transition-transform"
              onClick={() => handleReaction(reaction)}
            >
              <ReactionEmoji reaction={reaction} />
            </button>
          ))}
          <button type="button" aria-label={translations.customEmoji.moreReactions} aria-expanded={pickerOpen} onClick={(event) => { event.nativeEvent.stopPropagation(); setPickerOpen((open) => !open); }}
            className="flex h-8 w-8 items-center justify-center self-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {pickerOpen && <ReactionPicker onPick={handleReaction} />}
      </div>
    );
  }
);

ReactionMenu.displayName = 'ReactionMenu';

export default ReactionMenu;
