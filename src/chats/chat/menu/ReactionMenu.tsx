import React, { forwardRef, useState, useEffect } from 'react';
import { Message, ContextMenuState } from '@/types';

interface ReactionMenuProps {
  reactionMenu: { message: Message; x: number; y: number; isClosing?: boolean };
  wsRef: React.MutableRefObject<WebSocket | null>;
  userId: number;
  setReactionMenu: (value: { message: Message; x: number; y: number; isClosing?: boolean } | null) => void;
  onClose: () => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (value: ContextMenuState | null) => void;
}

const ReactionMenu = forwardRef<HTMLDivElement, ReactionMenuProps>(
  ({ reactionMenu, wsRef, userId, setReactionMenu, onClose, contextMenu, setContextMenu }, ref) => {
    const [adjustedX, setAdjustedX] = useState(reactionMenu.x);
    const [adjustedY, setAdjustedY] = useState(reactionMenu.y);
    const [isAnimated, setIsAnimated] = useState(false);
    const reactions = ['👍', '🥰', '😠', '😂', '😢'];

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
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
    }, [ref, reactionMenu, contextMenu, onClose, setReactionMenu, setContextMenu]);

    // Close ReactionMenu if ContextMenu is closed
    useEffect(() => {
      if (!contextMenu && reactionMenu) {
        setReactionMenu({ ...reactionMenu, isClosing: true });
        setTimeout(() => onClose(), 200);
      }
    }, [contextMenu, reactionMenu, setReactionMenu, onClose]);

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const menu = ref.current;
        const menuWidth = menu.clientWidth;
        const menuHeight = menu.clientHeight;

        let newX = reactionMenu.x;
        let newY = reactionMenu.y;

        if (newX + menuWidth > window.innerWidth) {
          newX = Math.max(0, newX - menuWidth);
        }
        if (newY + menuHeight > window.innerHeight) {
          newY = Math.max(0, newY - menuHeight);
        }

        setAdjustedX(newX);
        setAdjustedY(newY);
      }
    }, [reactionMenu.x, reactionMenu.y, ref]);

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
      console.log('Reaction clicked:', reaction); // Debug to confirm click
      if (wsRef.current) {
        console.log('WebSocket state:', wsRef.current.readyState); // Debug WebSocket state
        if (wsRef.current.readyState === WebSocket.OPEN) {
          const message = reactionMenu.message;
          const hasReaction = message.reactions?.some((r) => r.user_id === userId && r.reaction === reaction);
          const payload = {
            type: hasReaction ? 'reaction_remove' : 'reaction_add',
            message_id: message.id,
            reaction,
          };
          console.log('Sending WebSocket message:', payload);
          try {
            wsRef.current.send(JSON.stringify(payload));
            console.log('WebSocket message sent successfully');
          } catch (error) {
            console.error('Failed to send WebSocket message:', error);
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
        className="fixed flex items-center justify-center z-50"
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
              {reaction}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

ReactionMenu.displayName = 'ReactionMenu';

export default ReactionMenu;
