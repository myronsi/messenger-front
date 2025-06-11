import React, { forwardRef, useState, useEffect } from 'react';
import { Edit, Trash2, Copy, Reply } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContextMenuProps {
  x: number;
  y: number;
  isMine: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onReply: () => void;
}

const ContextMenuComponent = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ x, y, isMine, onEdit, onDelete, onCopy, onReply }, ref) => {
    const { translations } = useLanguage();
    const [adjustedX, setAdjustedX] = useState(x);
    const [adjustedY, setAdjustedY] = useState(y);

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const menuWidth = ref.current.clientWidth;
        const menuHeight = ref.current.clientHeight;
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

    return (
      <div
        ref={ref}
        className="fixed bg-popover border border-border shadow-lg rounded-md py-1 z-50 animate-fade-in"
        style={{ 
          top: adjustedY, 
          left: adjustedX,
          minWidth: '200px', // Фиксированная минимальная ширина
          width: '200px',    // Фиксированная ширина
        }}
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
        <button
          className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={onCopy}
        >
          <Copy className="w-4 h-4 mr-2" />
          <span className="truncate">{translations.copy}</span>
        </button>
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
