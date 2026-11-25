import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Edit, MoreHorizontal, Trash2, Copy, Reply, Forward, Sticker, ListEnd, ListMusic, ListPlus, Flag, Pin, PinOff, UserX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ContextMenuProps {
  x: number;
  y: number;
  isMine: boolean;
  openLeft?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onReply: () => void;
  onForward?: () => void;
  onMakeSticker?: () => void;
  onReport?: () => void;
  onTogglePin?: () => void;
  onNotMine?: () => void;
  pinned?: boolean;
  audioActions?: { onPlayNext: () => void; onAddToQueue: () => void; onAddToPlaylist: () => void };
  extraActions?: MenuAction[];
  isClosing: boolean;
  onClose: () => void;
}

type MenuView = 'main' | 'more';

export interface MenuAction {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

const EDGE = 8;
const REACTION_MENU_OFFSET = 48;

const ContextMenuComponent = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({
    x, y, isMine, openLeft = false, onEdit, onDelete, onCopy, onReply, onForward, onMakeSticker,
    onReport, onTogglePin, onNotMine, pinned = false, audioActions, extraActions = [], isClosing, onClose,
  }, ref) => {
    const { translations } = useLanguage();
    const [adjustedX, setAdjustedX] = useState(x);
    const [adjustedY, setAdjustedY] = useState(y);
    const [isAnimated, setIsAnimated] = useState(false);
    const [view, setView] = useState<{ name: MenuView; direction: 'forward' | 'back' | null }>({ name: 'main', direction: null });
    const itemClass = 'flex items-center w-full whitespace-nowrap px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors';
    const slideClass = view.direction === 'forward' ? 'profile-panel-slide-in-right' : view.direction === 'back' ? 'profile-panel-slide-in-left' : '';
    const moreActions: MenuAction[] = [
      ...(onMakeSticker ? [{ key: 'sticker', icon: Sticker, label: translations.makeSticker, onClick: onMakeSticker }] : []),
      ...(onReport ? [{ key: 'report', icon: Flag, label: translations.moderation.reportMessage, onClick: onReport }] : []),
      ...(onNotMine ? [{ key: 'notMine', icon: UserX, label: translations.chatImport.notMine, onClick: onNotMine }] : []),
    ];
    const showMorePage = moreActions.length > 1;
    const goBack = () => setView({ name: 'main', direction: 'back' });
    const renderAction = ({ key, icon: Icon, label, onClick }: MenuAction) => (
      <button key={key} type="button" className={itemClass} onClick={onClick}>
        <Icon className="w-4 h-4 mr-2" />
        <span className="truncate">{label}</span>
      </button>
    );

    const placement = useRef<{ x: number; y: number; above: boolean } | null>(null);
    useLayoutEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const menu = ref.current;
        const left = openLeft ? x - menu.offsetWidth : x;
        if (placement.current?.x !== x || placement.current.y !== y) {
          placement.current = { x, y, above: y + menu.offsetHeight > window.innerHeight - EDGE };
        }
        const top = placement.current.above ? y - menu.offsetHeight - REACTION_MENU_OFFSET : y;
        setAdjustedX(Math.max(EDGE, Math.min(left, window.innerWidth - menu.offsetWidth - EDGE)));
        setAdjustedY(Math.max(EDGE, Math.min(top, window.innerHeight - menu.offsetHeight - EDGE)));
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
        {view.name === 'more' ? (
          <div key="more" className={slideClass}>
            <button type="button" className={`${itemClass} font-medium`} onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="truncate">{translations.moreMessageActions}</span>
            </button>
            <div className="my-1 border-t border-border" />
            {moreActions.map(renderAction)}
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
            {onTogglePin && (
              <button type="button" className={itemClass} onClick={onTogglePin}>
                {pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                <span className="truncate">{pinned ? translations.messagePins.unpin : translations.messagePins.pin}</span>
              </button>
            )}
            {audioActions && (
              <>
                <button type="button" className={itemClass} onClick={audioActions.onPlayNext}>
                  <ListPlus className="w-4 h-4 mr-2" />
                  <span className="truncate">{translations.audioPlayer.playNext}</span>
                </button>
                <button type="button" className={itemClass} onClick={audioActions.onAddToQueue}>
                  <ListEnd className="w-4 h-4 mr-2" />
                  <span className="truncate">{translations.audioPlayer.addToQueue}</span>
                </button>
                <button type="button" className={itemClass} onClick={audioActions.onAddToPlaylist}>
                  <ListMusic className="w-4 h-4 mr-2" />
                  <span className="truncate">{translations.audioPlayer.addToPlaylist}</span>
                </button>
              </>
            )}
            {extraActions.map(renderAction)}
            {isMine && onEdit && (
              <button type="button" className={itemClass} onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                <span className="truncate">{translations.editMessage}</span>
              </button>
            )}
            {showMorePage ? (
              <button type="button" className={itemClass} onClick={() => setView({ name: 'more', direction: 'forward' })}>
                <MoreHorizontal className="w-4 h-4 mr-2" />
                <span className="truncate mr-4">{translations.moreMessageActions}</span>
                <ChevronRight className="w-4 h-4 ml-auto shrink-0 text-muted-foreground" />
              </button>
            ) : moreActions.map(renderAction)}
            {onDelete && (
              <>
                <div className="my-1 border-t border-border" />
                <button type="button" className={`${itemClass} text-destructive hover:text-destructive`} onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="truncate">{translations.deleteMessage}</span>
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
