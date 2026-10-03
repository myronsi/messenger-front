import type { Translations } from '@/shared/contexts/LanguageContext';
import { MessageSquare } from 'lucide-react';
import type { Chat, ChatLastMessage } from '@/entities/message';
import ChatListItem from './ChatListItem';

interface ChatListBodyProps {
  chats: Chat[];
  activeChatId?: number;
  translations: Translations;
  getLastMessagePreview: (lastMessage?: ChatLastMessage | null) => string;
  getLastMessageTime: (lastMessage?: ChatLastMessage | null) => string;
  isOwnLastMessage: (lastMessage?: ChatLastMessage | null) => boolean;
  isOwnLastMessageRead: (lastMessage?: ChatLastMessage | null) => boolean;
  onChatClick: (chat: Chat) => void;
  onChatContextMenu: (event: React.MouseEvent, chat: Chat) => void;
}

const ChatListBody: React.FC<ChatListBodyProps> = ({
  chats,
  activeChatId,
  translations,
  getLastMessagePreview,
  getLastMessageTime,
  isOwnLastMessage,
  isOwnLastMessageRead,
  onChatClick,
  onChatContextMenu,
}) => {
  if (chats.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
          <MessageSquare className="w-12 h-12" />
          <p>{translations.noChats}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          activeChatId={activeChatId}
          translations={translations}
          getLastMessagePreview={getLastMessagePreview}
          getLastMessageTime={getLastMessageTime}
          isOwnLastMessage={isOwnLastMessage}
          isOwnLastMessageRead={isOwnLastMessageRead}
          onClick={onChatClick}
          onContextMenu={onChatContextMenu}
        />
      ))}
    </div>
  );
};

export default ChatListBody;
