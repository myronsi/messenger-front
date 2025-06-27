import React, { forwardRef, useState, useEffect } from 'react';
import { Edit, Trash2, Copy, Reply } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContextMenuProps {
  x: number;
  y: number;
  isMine: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCopy?: () => void; // Made onCopy optional
  onReply: () => void;
  isClosing: boolean;
  onClose: () => void;
}

const ContextMenuComponent = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ x, y, isMine, onEdit, onDelete, onCopy, onReply, isClosing, onClose }, ref) => {
    const { translations } = useLanguage();
    const [adjustedX, setAdjustedX] = useState(x);
    const [adjustedY, setAdjustedY] = useState(y);
    const [isAnimated, setIsAnimated] = useState(false);

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const menu = ref.current;
        const menuWidth = menu.clientWidth;
        const menuHeight = menu.clientHeight;

        let newX = x;
        let newY = y;

        if (x + menuWidth > window.innerWidth) {
          newX = Math.max(0, x - menuWidth);
        }
        if (y + menuHeight > window.innerHeight) {
          newY = Math.max(0, y - menuHeight);
        }

        setAdjustedX(newX);
        setAdjustedY(newY);
      }
    }, [x, y, ref]);

    useEffect(() => {
      if (!isClosing) {
        setTimeout(() => setIsAnimated(true), 0);
      } else {
        setIsAnimated(false);
      }
    }, [isClosing]);

    const relativeX = x - adjustedX;
    const relativeY = y - adjustedY;

    const handleTransitionEnd = (event: React.TransitionEvent) => {
      if (isClosing && event.propertyName === 'transform') {
        onClose();
      }
    };

    return (
      <div
        ref={ref}
        className="fixed bg-popover border border-border shadow-lg rounded-md py-1 z-50"
        style={{
          top: adjustedY,
          left: adjustedX,
          minWidth: '160px',
          width: '160px',
          transform: isAnimated ? 'scale(1)' : 'scale(0)',
          opacity: isAnimated ? 1 : 0,
          transition: 'transform 0.2s, opacity 0.2s',
          transformOrigin: `${relativeX}px ${relativeY}px`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {isMine && (
          <>
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              <span className="truncate">{translations.editMessage}</span>
            </button>
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="truncate">{translations.deleteMessage}</span>
            </button>
          </>
        )}
        {onCopy && (
          <button
            className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={onCopy}
          >
            <Copy className="w-4 h-4 mr-2" />
            <span className="truncate">{translations.copy}</span>
          </button>
        )}
        <button
          className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={onReply}
        >
          <Reply className="w-4 h-4 mr-2" />
          <span className="truncate">{translations.replyToMessage}</span>
        </button>
      </div>
    );
  }
);

ContextMenuComponent.displayName = 'ContextMenuComponent';

export default ContextMenuComponent;
