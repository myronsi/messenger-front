import { CheckCheck, Pin, PinOff } from 'lucide-react';
import type { ChatContextMenuState } from '../model/types';

interface ChatContextMenuProps {
  menu: ChatContextMenuState | null;
  unreadCount: number;
  translations: any;
  onMarkAsRead: (chatId: number) => void;
  onTogglePinned: (chatId: number) => void;
}

const ChatContextMenu: React.FC<ChatContextMenuProps> = ({ menu, unreadCount, translations, onMarkAsRead, onTogglePinned }) => {
  if (!menu) return null;

  return (
    <div
      className="fixed z-50 min-w-40 rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg"
      style={{
        left: Math.min(menu.x, window.innerWidth - 176),
        top: Math.min(menu.y, window.innerHeight - 96),
      }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        aria-hidden={unreadCount === 0}
        disabled={unreadCount === 0}
        onClick={() => onMarkAsRead(menu.chatId)}
        className={`motion-read-action flex w-full items-center gap-2 overflow-hidden px-3 text-left text-sm hover:bg-accent hover:text-accent-foreground ${unreadCount > 0 ? 'is-visible py-2' : ''}`}
      >
        <CheckCheck className="h-4 w-4" />
        <span>{translations.markAsRead || 'Mark as read'}</span>
      </button>
      <button
        type="button"
        onClick={() => onTogglePinned(menu.chatId)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {menu.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        <span>{menu.isPinned ? translations.unpin || 'Unpin' : translations.pin || 'Pin'}</span>
      </button>
    </div>
  );
};

export default ChatContextMenu;
