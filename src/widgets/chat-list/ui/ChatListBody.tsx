import { useRef, useState, type TouchEvent } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { Archive, ArrowLeft, ChevronRight, MessageSquare } from 'lucide-react';
import type { Chat, ChatLastMessage } from '@/entities/message';
import { Button } from '@/shared/ui/button';
import ChatListItem from './ChatListItem';
import { usePinnedReorder } from '../model/usePinnedReorder';

const PULL_TO_REVEAL = 64;
const isCoarsePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

interface ChatListBodyProps {
  chats: Chat[];
  activeChatId?: EntityId;
  contextChatId?: EntityId;
  translations: Translations;
  getLastMessagePreview: (lastMessage?: ChatLastMessage | null) => string;
  getLastMessageTime: (lastMessage?: ChatLastMessage | null) => string;
  isOwnLastMessage: (lastMessage?: ChatLastMessage | null) => boolean;
  isOwnLastMessageRead: (lastMessage?: ChatLastMessage | null) => boolean;
  onStartChat: (rect: DOMRect) => void;
  onChatClick: (chat: Chat) => void;
  onChatContextMenu: (event: React.MouseEvent, chat: Chat) => void;
  onOpenChatMenuAt?: (chat: Chat, x: number, y: number) => void;
  onCloseChatMenu?: () => void;
  onToggleArchived?: (chatId: EntityId) => void;
  onReorderPinned?: (ids: EntityId[]) => void;
}

const ArchivedRow = ({ chats, translations, onOpen }: { chats: Chat[]; translations: Translations; onOpen: () => void }) => {
  const unread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
  return (
    <button type="button" data-testid="archived-chats-row" onClick={onOpen}
      className="motion-list-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left [@media(hover:hover)]:hover:bg-accent">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Archive className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-5">{translations.chatOrganizer.archivedChats}</span>
        <span className="block truncate text-sm text-muted-foreground">{chats.map((chat) => chat.is_saved ? translations.chatOrganizer.savedMessages : chat.display_name || chat.name).join(', ')}</span>
      </span>
      {unread > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted-foreground px-1.5 text-xs font-semibold text-background">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
};

const ChatListBody: React.FC<ChatListBodyProps> = ({
  chats,
  activeChatId,
  contextChatId,
  translations,
  getLastMessagePreview,
  getLastMessageTime,
  isOwnLastMessage,
  isOwnLastMessageRead,
  onStartChat,
  onChatClick,
  onChatContextMenu,
  onOpenChatMenuAt,
  onCloseChatMenu,
  onToggleArchived,
  onReorderPinned,
}) => {
  const [showArchived, setShowArchived] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const pull = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const archived = chats.filter((chat) => chat.is_archived);
  const main = chats.filter((chat) => !chat.is_archived);
  const inArchive = showArchived && archived.length > 0;
  const shown = inArchive ? archived : main;
  const pinnedIds = inArchive ? [] : main.filter((chat) => chat.is_pinned).map((chat) => chat.id);
  const byId = new Map(chats.map((chat) => [chat.id, chat]));
  const reorder = usePinnedReorder({
    pinnedIds,
    onCommit: (ids) => onReorderPinned?.(ids),
    onHold: (id, x, y) => {
      const chat = byId.get(id);
      if (chat && onOpenChatMenuAt) onOpenChatMenuAt(chat, x, y);
    },
    onDragStart: () => onCloseChatMenu?.(),
  });
  const showArchivedRow = !inArchive && archived.length > 0 && (revealed || !isCoarsePointer());

  const onTouchStart = (event: TouchEvent) => {
    pull.current = (listRef.current?.scrollTop ?? 0) <= 0 ? event.touches[0]?.clientY ?? null : null;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (pull.current === null || revealed || !archived.length) return;
    const y = event.touches[0]?.clientY;
    if (y !== undefined && y - pull.current > PULL_TO_REVEAL) {
      setRevealed(true);
      pull.current = null;
    }
  };

  if (chats.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
          <MessageSquare className="w-12 h-12" />
          <p>{translations.noChats}</p>
          <Button onClick={event => onStartChat(event.currentTarget.getBoundingClientRect())}>{translations.appShell.startChat}</Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
      {inArchive && (
        <button type="button" data-testid="archived-chats-back" onClick={() => setShowArchived(false)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] font-semibold [@media(hover:hover)]:hover:bg-accent">
          <ArrowLeft className="h-4 w-4" aria-label={translations.chatOrganizer.backToChats} />
          <span>{translations.chatOrganizer.archivedChats}</span>
        </button>
      )}
      {showArchivedRow && <ArchivedRow chats={archived} translations={translations} onOpen={() => setShowArchived(true)} />}
      {shown.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          activeChatId={activeChatId}
          isContextSelected={chat.id === contextChatId}
          translations={translations}
          getLastMessagePreview={getLastMessagePreview}
          getLastMessageTime={getLastMessageTime}
          isOwnLastMessage={isOwnLastMessage}
          isOwnLastMessageRead={isOwnLastMessageRead}
          onClick={onChatClick}
          onContextMenu={onChatContextMenu}
          binding={reorder.bind(chat.id)}
          dragOffset={reorder.offsetOf(chat.id)}
          isDragging={reorder.draggingId === chat.id}
          onSwipeArchive={onToggleArchived && !chat.pending_approval_request ? (target) => onToggleArchived(target.id) : undefined}
        />
      ))}
    </div>
  );
};

export default ChatListBody;
