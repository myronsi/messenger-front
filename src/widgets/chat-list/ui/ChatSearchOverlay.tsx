import { X } from 'lucide-react';
import type { OneOnOneChatResponse } from '@/entities/chat';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import SearchUsers from '../SearchUsers';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { ChatsListComponentProps } from '../model/types';

interface ChatSearchOverlayProps {
  visible: boolean;
  showSearch: boolean;
  circleStyle: { left: number; top: number; size: number } | null;
  circleActive: boolean;
  translations: any;
  username: string;
  oneOnOneChats: OneOnOneChatResponse['chats'];
  onChatOpen: ChatsListComponentProps['onChatOpen'];
  onClose: () => void;
  onCreated: () => void;
}

// Overlay that reveals the "search / start a chat" panel via an expanding
// circle animation (geometry/state owned by useChatSearchOverlay).
const ChatSearchOverlay: React.FC<ChatSearchOverlayProps> = ({
  visible,
  showSearch,
  circleStyle,
  circleActive,
  translations,
  username,
  oneOnOneChats,
  onChatOpen,
  onClose,
  onCreated,
}) => {
  if (!visible) return null;

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
          className={`absolute rounded-full bg-white/90 transform transition-transform duration-300 ease-out ${
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
            <button onClick={onClose} className="p-1 rounded-full hover:bg-accent">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <SearchUsers
          currentUsername={username}
          translations={translations}
          onCreated={() => { onCreated(); onClose(); }}
          onClose={() => onClose()}
          onOpenPreview={(previewUsername: string) => {
            // If a one-on-one chat with this user already exists, open it instead of creating a preview
            const existing = oneOnOneChats.find((c) => {
              const name = (c.interlocutor_name || '').toLowerCase();
              return name === previewUsername.toLowerCase();
            });
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
                resolveMediaUrl(existing.avatar_url, DEFAULT_AVATAR)
              );
              onClose();
              return;
            }

            // open a temporary (fake) chat — real chat will be created when the first message is sent
            const tempId = -Date.now();
            onChatOpen(tempId, previewUsername, false, 'one-on-one');
            onClose();
          }}
        />
      </div>
    </div>
  );
};

export default ChatSearchOverlay;
