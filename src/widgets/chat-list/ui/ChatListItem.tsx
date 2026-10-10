import type { Translations } from '@/shared/contexts/LanguageContext';
import { Check, CheckCheck, Pin } from 'lucide-react';
import type { Chat, ChatLastMessage } from '@/entities/message';
import type { Id } from '@/shared/lib/ids';
import MediaImg from '@/shared/ui/MediaImg';

interface ChatListItemProps {
  chat: Chat;
  activeChatId?: Id;
  translations: Translations;
  getLastMessagePreview: (lastMessage?: ChatLastMessage | null) => string;
  getLastMessageTime: (lastMessage?: ChatLastMessage | null) => string;
  isOwnLastMessage: (lastMessage?: ChatLastMessage | null) => boolean;
  isOwnLastMessageRead: (lastMessage?: ChatLastMessage | null) => boolean;
  onClick: (chat: Chat) => void;
  onContextMenu: (event: React.MouseEvent, chat: Chat) => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  activeChatId,
  translations,
  getLastMessagePreview,
  getLastMessageTime,
  isOwnLastMessage,
  isOwnLastMessageRead,
  onClick,
  onContextMenu,
}) => {
  const ownLastMessage = isOwnLastMessage(chat.last_message);
  const ownLastMessageRead = isOwnLastMessageRead(chat.last_message);
  const ownLastMessageFailed = ownLastMessage && !!chat.last_message?.delivery_error;
  const isActive = chat.id === activeChatId;
  const unreadCount = chat.unread_count || 0;

  return (
    <div
      data-testid="chat-list-item"
      data-chat-name={chat.name}
      onClick={() => onClick(chat)}
      onContextMenu={(event) => onContextMenu(event, chat)}
      className={`motion-list-item motion-press flex items-center p-3 rounded-lg cursor-pointer ${
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <div className="relative mr-3">
        <MediaImg
          src={chat.avatar_url}
          alt={chat.display_name || chat.name}
          className={`motion-avatar w-10 h-10 rounded-full object-cover ${chat.interlocutor_deleted ? 'opacity-50' : ''}`}
        />
        {chat.type === 'one-on-one' && !chat.interlocutor_deleted && (
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
              chat.is_online ? 'motion-presence bg-green-500' : 'bg-gray-400'
            }`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className={`flex min-w-0 items-center gap-1.5 ${unreadCount ? 'font-semibold' : 'font-medium'}`}>
          {chat.is_pinned && (
            <Pin className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} />
          )}
          <span className="truncate">
            {chat.interlocutor_deleted ? translations.deletedUser : chat.display_name || chat.name}
          </span>
        </div>
        <div className={`truncate text-xs ${isActive ? 'text-primary-foreground/80' : unreadCount ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {getLastMessagePreview(chat.last_message)}
        </div>
      </div>

      <div className="ml-2 flex min-w-[44px] flex-col items-end">
        {chat.last_message && (
          <span className={`motion-unread-time text-[11px] leading-none ${unreadCount ? 'has-unread' : ''} ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            {getLastMessageTime(chat.last_message)}
          </span>
        )}
        {ownLastMessage && !ownLastMessageFailed && !unreadCount ? (
          <span className={`flex h-5 items-center transition-colors duration-150 ${isActive ? 'text-primary-foreground/80' : ownLastMessageRead ? 'text-primary' : 'text-muted-foreground'}`} title={ownLastMessageRead ? 'Read' : 'Unread'}>
            {ownLastMessageRead ? <CheckCheck size={16} /> : <Check size={16} />}
          </span>
        ) : null}
        <span
          aria-hidden={unreadCount === 0}
          className={`motion-unread-indicator flex items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${unreadCount ? `is-visible ${isActive ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}` : ''}`}
        >
          {unreadCount > 99 ? '99+' : unreadCount || ''}
        </span>
        {chat.type === 'group' && (
          <span className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>({translations.group})</span>
        )}
      </div>
    </div>
  );
};

export default ChatListItem;
