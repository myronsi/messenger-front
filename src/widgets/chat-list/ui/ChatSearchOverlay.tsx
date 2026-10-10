import { useMemo } from 'react';
import { newLocalId } from '@/shared/lib/ids';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { X } from 'lucide-react';
import type { OneOnOneChatResponse } from '@/entities/chat';
import type { Chat, MessageSearchHit } from '@/entities/message';
import type { User } from '@/entities/user';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import GlobalSearch from './GlobalSearch';
import { mediaUrl } from '@/shared/lib/mediaUrl';
import type { ChatsListComponentProps } from '../model/types';
import type { Id } from '@/shared/lib/ids';

interface ChatSearchOverlayProps {
  visible: boolean;
  showSearch: boolean;
  circleStyle: { left: number; top: number; size: number } | null;
  circleActive: boolean;
  translations: Translations;
  username: string;
  oneOnOneChats: OneOnOneChatResponse['chats'];
  chats: Chat[];
  onChatOpen: ChatsListComponentProps['onChatOpen'];
  onOpenSearchHit: (hit: MessageSearchHit) => void;
  onClose: () => void;
  onCreated: () => void;
}

// Overlay that reveals the search panel (people and messages) via an expanding
// circle animation (geometry/state owned by useChatSearchOverlay).
const ChatSearchOverlay: React.FC<ChatSearchOverlayProps> = ({
  visible,
  showSearch,
  circleStyle,
  circleActive,
  translations,
  username,
  oneOnOneChats,
  chats,
  onChatOpen,
  onOpenSearchHit,
  onClose,
}) => {
  const chatsById = useMemo(() => Object.fromEntries(chats.map((chat) => [chat.id, chat])) as Record<Id, Chat>, [chats]);

  if (!visible) return null;

  // A person opens the chat with them, or a draft chat that is created with the first message.
  const openUser = (user: User) => {
    const existing = oneOnOneChats.find((chat) => (chat.interlocutor_name || '').toLowerCase() === user.username.toLowerCase());
    if (existing) {
      onChatOpen(
        existing.id,
        existing.interlocutor_name,
        existing.interlocutor_deleted || false,
        'one-on-one',
        existing.interlocutor_display_name || existing.interlocutor_name,
        existing.interlocutor_is_online,
        existing.interlocutor_last_seen,
        null,
        mediaUrl(existing.avatar_url, DEFAULT_AVATAR)
      );
    } else {
      onChatOpen(newLocalId(), user.username, false, 'one-on-one');
    }
    onClose();
  };

  const openHit = (hit: MessageSearchHit) => {
    onOpenSearchHit(hit);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto overflow-hidden">
      {/* expanding circle background */}
      {circleStyle && (
        <div
          aria-hidden
          style={{
            left: circleStyle.left,
            top: circleStyle.top,
            width: circleStyle.size,
            height: circleStyle.size,
          }}
          className={`absolute rounded-full bg-background/95 transform transition-transform duration-300 ease-out ${
            circleActive ? 'scale-100' : 'scale-0'
          }`}
        />
      )}

      {/* overlay content sits above the circle */}
      <div
        id="search-overlay"
        className={`absolute inset-0 p-4 overflow-auto flex flex-col ${
          showSearch ? 'opacity-100 duration-300 translate-y-0' : 'opacity-0 duration-200 translate-y-2'
        } transition-all`}
        style={{
          // ensure overlay content is above the circle
          zIndex: 60,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{translations.search}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} aria-label={translations.close || 'Close'} className="p-1 rounded-full hover:bg-accent">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <GlobalSearch
          translations={translations}
          currentUsername={username}
          chatsById={chatsById}
          onOpenUser={openUser}
          onOpenMessage={openHit}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default ChatSearchOverlay;
