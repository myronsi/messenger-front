import React, { forwardRef, useState, useEffect } from 'react';
import { ArrowLeft, CheckSquare, Edit, Trash2, Copy, Reply, Forward, Sticker } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ContextMenuProps {
  x: number;
  y: number;
  isMine: boolean;
  openLeft?: boolean;
  onEdit?: () => void;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
  forBoth?: boolean;
  onCopy?: () => void;
  onReply: () => void;
  onForward?: () => void;
  onSelect?: () => void;
  onMakeSticker?: () => void;
  isClosing: boolean;
  onClose: () => void;
}

const EDGE = 8;
const REACTION_MENU_OFFSET = 48;

const ContextMenuComponent = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({
    x, y, isMine, openLeft = false, onEdit, onDeleteForMe, onDeleteForEveryone, forBoth = false, onCopy, onReply, onForward, onSelect, onMakeSticker,
    isClosing, onClose,
  }, ref) => {
    const { translations } = useLanguage();
    const [adjustedX, setAdjustedX] = useState(x);
    const [adjustedY, setAdjustedY] = useState(y);
    const [isAnimated, setIsAnimated] = useState(false);
    const [view, setView] = useState<{ name: 'main' | 'delete'; direction: 'forward' | 'back' | null }>({ name: 'main', direction: null });
    const itemClass = 'flex items-center w-full whitespace-nowrap px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors';
    const slideClass = view.direction === 'forward' ? 'profile-panel-slide-in-right' : view.direction === 'back' ? 'profile-panel-slide-in-left' : '';

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const menu = ref.current;
        const left = openLeft ? x - menu.offsetWidth : x;
        const top = y + menu.offsetHeight > window.innerHeight - EDGE ? y - menu.offsetHeight - REACTION_MENU_OFFSET : y;
        setAdjustedX(Math.max(EDGE, Math.min(left, window.innerWidth - menu.offsetWidth - EDGE)));
        setAdjustedY(Math.max(EDGE, top));
      }
    }, [x, y, openLeft, ref, view.name]);

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
        role="menu"
        className="fixed overflow-hidden bg-popover border border-border shadow-lg rounded-md py-1 z-50"
        style={{
          top: adjustedY,
          left: adjustedX,
          maxWidth: 'min(16rem, calc(100vw - 1rem))',
          width: 'max-content',
          transform: isAnimated ? 'scale(1)' : 'scale(0)',
          opacity: isAnimated ? 1 : 0,
          transition: 'transform 0.2s, opacity 0.2s',
          transformOrigin: `${relativeX}px ${relativeY}px`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {view.name === 'delete' ? (
          <div key="delete" className={slideClass}>
            <button type="button" className={`${itemClass} font-medium`} onClick={() => setView({ name: 'main', direction: 'back' })}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="truncate">{translations.deleteMessage}</span>
            </button>
            <div className="my-1 border-t border-border" />
            <button type="button" className={`${itemClass} text-destructive hover:text-destructive`} onClick={onDeleteForMe}>
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="truncate">{translations.deleteForMeShort || 'For me'}</span>
            </button>
            <button type="button" className={`${itemClass} font-medium text-destructive hover:text-destructive`} onClick={onDeleteForEveryone}>
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="truncate">{forBoth ? translations.deleteForBothShort : translations.deleteForEveryoneShort || 'For everyone'}</span>
            </button>
          </div>
        ) : (
          <div key="main" className={slideClass}>
            <button type="button" className={itemClass} onClick={onReply}>
              <Reply className="w-4 h-4 mr-2" />
              <span className="truncate">{translations.replyToMessage}</span>
            </button>
            {onCopy && (
              <button type="button" className={itemClass} onClick={onCopy}>
                <Copy className="w-4 h-4 mr-2" />
                <span className="truncate">{translations.copy}</span>
              </button>
            )}
            {onForward && (
              <button type="button" className={itemClass} onClick={onForward}>
                <Forward className="w-4 h-4 mr-2" />
                <span className="truncate">{translations.forward || 'Forward'}</span>
              </button>
            )}
            {onMakeSticker && (
              <button type="button" className={itemClass} onClick={onMakeSticker}>
                <Sticker className="w-4 h-4 mr-2" />
                <span className="truncate">{translations.makeSticker}</span>
              </button>
            )}
            {onSelect && (
              <button type="button" className={itemClass} onClick={onSelect}>
                <CheckSquare className="w-4 h-4 mr-2" />
                <span className="truncate">{translations.selectMessage}</span>
              </button>
            )}
            {isMine && onEdit && (
              <button type="button" className={itemClass} onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                <span className="truncate">{translations.editMessage}</span>
              </button>
            )}
            {onDeleteForMe && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  className={`${itemClass} text-destructive hover:text-destructive`}
                  onClick={() => (onDeleteForEveryone ? setView({ name: 'delete', direction: 'forward' }) : onDeleteForMe())}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="truncate">{onDeleteForEveryone ? translations.deleteMessage : translations.deleteForMe || 'Delete for me'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

ContextMenuComponent.displayName = 'ContextMenuComponent';

export default ContextMenuComponent;
