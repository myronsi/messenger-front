import type { Translations } from '@/shared/contexts/LanguageContext';
import type { OneOnOneChatResponse } from '@/entities/chat';
import type { Chat, GlobalSearchHit } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import type { AppLanguage } from '@/shared/lang/languages';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { GlobalSearchPanel } from '@/features/global-search';
import { BackToClose } from '@/shared/ui/BackToClose';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { ChatsListComponentProps } from '../model/types';

interface ChatSearchOverlayProps {
  visible: boolean;
  showSearch: boolean;
  circleStyle: { left: number; top: number; size: number } | null;
  circleActive: boolean;
  translations: Translations;
  language: AppLanguage;
  username: string;
  currentUserId?: EntityId;
  chats: Chat[];
  activeChatId?: EntityId;
  oneOnOneChats: OneOnOneChatResponse['chats'];
  onChatOpen: ChatsListComponentProps['onChatOpen'];
  onChatClick: (chat: Chat) => void;
  onJumpToMessage?: ChatsListComponentProps['onJumpToMessage'];
  onClose: () => void;
}

const ChatSearchOverlay = ({
  visible, showSearch, circleStyle, circleActive, translations, language, username, currentUserId, chats, activeChatId,
  oneOnOneChats, onChatOpen, onChatClick, onJumpToMessage, onClose,
}: ChatSearchOverlayProps) => {
  if (!visible) return null;

  const openChat = (chat: Chat) => {
    if (String(chat.id) !== String(activeChatId)) onChatClick(chat);
    onClose();
  };

  const openUser = (previewUsername: string) => {
    const existing = oneOnOneChats.find((chat) => (chat.interlocutor_name || '').toLowerCase() === previewUsername.toLowerCase());
    if (existing) {
      onChatOpen(
        existing.id, existing.interlocutor_name, existing.interlocutor_deleted || false, 'one-on-one',
        existing.interlocutor_display_name || existing.interlocutor_name, existing.interlocutor_is_online, existing.interlocutor_last_seen,
        null, resolveMediaUrl(existing.avatar_url, DEFAULT_AVATAR),
      );
    } else {
      onChatOpen(-Date.now(), previewUsername, false, 'one-on-one');
    }
    onClose();
  };

  const openHit = (hit: GlobalSearchHit) => {
    onJumpToMessage?.(hit.chatId, hit.message.id);
    const chat = chats.find((candidate) => String(candidate.id) === hit.chatId);
    if (chat && String(chat.id) !== String(activeChatId)) onChatClick(chat);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto overflow-hidden">
      {showSearch && <BackToClose flag="userSearch" onClose={onClose} />}
      {circleStyle && (
        <div
          aria-hidden
          style={{ left: circleStyle.left, top: circleStyle.top, width: circleStyle.size, height: circleStyle.size }}
          className={`absolute rounded-full bg-background/90 transform transition-transform duration-300 ease-out ${
            circleActive ? 'scale-100' : 'scale-0'
          }`}
        />
      )}
      <div
        id="search-overlay"
        data-testid="search-overlay"
        className={`absolute inset-0 z-[60] flex flex-col overflow-hidden bg-background ${
          showSearch ? 'opacity-100 duration-300 translate-y-0' : 'opacity-0 duration-200 translate-y-2'
        } transition-all`}
      >
        <GlobalSearchPanel
          chats={chats}
          currentUserId={currentUserId == null ? undefined : String(currentUserId)}
          currentUsername={username}
          translations={translations}
          language={language}
          onOpenChat={openChat}
          onOpenUser={openUser}
          onOpenHit={openHit}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default ChatSearchOverlay;
