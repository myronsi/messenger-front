import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { CheckCheck, Pin, PinOff } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChatMuteMenuItems } from '@/features/chat-mute';
import type { ChatContextMenuState } from '../model/types';
import { useDismissFirstMenu } from '@/shared/lib/useDismissFirstMenu';

const EDGE_GAP = 8;
const CLOSE_MS = 100;

interface ChatContextMenuProps {
  menu: ChatContextMenuState | null;
  unreadCount: number;
  translations: Translations;
  onMarkAsRead: (chatId: EntityId) => void;
  onTogglePinned: (chatId: EntityId) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

type MenuView = { chatId: EntityId | null; name: 'main' | 'mute'; direction: 'forward' | 'back' | null };

const ChatContextMenu: React.FC<ChatContextMenuProps> = ({ menu, unreadCount, translations, onMarkAsRead, onTogglePinned, onClose, onError }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useDismissFirstMenu(!!menu, menuRef, onClose);
  const [shown, setShown] = useState(menu);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [view, setView] = useState<MenuView>({ chatId: null, name: 'main', direction: null });

  useEffect(() => {
    if (menu) {
      setShown(menu);
      const frame = requestAnimationFrame(() => setIsOpen(true));
      return () => cancelAnimationFrame(frame);
    }
    setIsOpen(false);
    const timer = setTimeout(() => {
      setShown(null);
      setView({ chatId: null, name: 'main', direction: null });
    }, CLOSE_MS);
    return () => clearTimeout(timer);
  }, [menu]);

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!shown || !element) {
      setPosition(null);
      return;
    }
    const place = () => setPosition({
      left: Math.max(EDGE_GAP, Math.min(shown.x, window.innerWidth - element.offsetWidth - EDGE_GAP)),
      top: Math.max(EDGE_GAP, Math.min(shown.y, window.innerHeight - element.offsetHeight - EDGE_GAP)),
    });
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown]);

  if (!shown) return null;

  const isChoosingMute = view.chatId === shown.chatId && view.name === 'mute';
  const direction = view.chatId === shown.chatId ? view.direction : null;
  const slideClass = direction === 'forward' ? 'profile-panel-slide-in-right' : direction === 'back' ? 'profile-panel-slide-in-left' : '';
  const isVisible = isOpen && !!position;
  const left = position?.left ?? shown.x;
  const top = position?.top ?? shown.y;
  const showMuteChoice = (open: boolean) => setView({ chatId: shown.chatId, name: open ? 'mute' : 'main', direction: open ? 'forward' : 'back' });

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 w-max max-w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg"
      style={{
        left,
        top,
        visibility: position ? 'visible' : 'hidden',
        transform: isVisible ? 'scale(1)' : 'scale(0)',
        opacity: isVisible ? 1 : 0,
        transition: isVisible ? 'transform 0.1s ease-out, opacity 0.1s ease-out, left 0.1s ease-out, top 0.1s ease-out' : 'transform 0.1s ease-out, opacity 0.1s ease-out',
        transformOrigin: `${shown.x - left}px ${shown.y - top}px`,
        pointerEvents: menu ? undefined : 'none',
      }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div key={isChoosingMute ? 'mute' : 'main'} className={slideClass}>
        {!isChoosingMute && (
          <>
            <button
              type="button"
              aria-hidden={unreadCount === 0}
              disabled={unreadCount === 0}
              onClick={() => onMarkAsRead(shown.chatId)}
              className={`motion-read-action flex items-center gap-2 overflow-hidden whitespace-nowrap px-3 text-left text-sm hover:bg-accent hover:text-accent-foreground ${unreadCount > 0 ? 'is-visible w-full py-2' : 'w-0 min-w-full'}`}
            >
              <CheckCheck className="h-4 w-4" />
              <span>{translations.markAsRead || 'Mark as read'}</span>
            </button>
            <button
              type="button"
              onClick={() => onTogglePinned(shown.chatId)}
              className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {shown.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              <span>{shown.isPinned ? translations.unpin : translations.pin}</span>
            </button>
          </>
        )}
        <ChatMuteMenuItems
          key={String(shown.chatId)}
          chatId={shown.chatId}
          isChoosing={isChoosingMute}
          onChoosingChange={showMuteChoice}
          onDone={onClose}
          onError={onError}
        />
      </div>
    </div>
  );
};

export default ChatContextMenu;
