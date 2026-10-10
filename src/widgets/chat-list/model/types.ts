import { Chat, ChatLastMessage } from '@/entities/message';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { useLanguage } from '@/shared/contexts/LanguageContext';
import type { Id } from '@/shared/lib/ids';

// Derived from useLanguage's return type so the widget always matches the
// active language bundle's shape without depending on its internal type name.
export type Translations = ReturnType<typeof useLanguage>['translations'];

export const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getMediaSrc = (path?: string | null, fallback: string = DEFAULT_AVATAR) => resolveMediaUrl(path, fallback);

export interface ChatsListComponentProps {
  username: string;
  onChatOpen: (
    chatId: Id,
    chatName: string,
    interlocutorDeleted: boolean,
    type: 'one-on-one' | 'group',
    chatDisplayName?: string,
    isOnline?: boolean,
    lastSeen?: string | null,
    firstUnreadMessageId?: Id | null,
    avatarUrl?: string,
    pendingApprovalRequest?: boolean,
    pendingApprovalMessage?: string,
  ) => void;
  setIsProfileOpen: (open: boolean) => void;
  activeChatId?: Id;
  activeChatName?: string;
  onActiveChatUpdate?: (chat: Chat) => void;
  onChatDeleted?: (chatId: Id) => void;
}

// WebSocket message interface
export interface WebSocketMessage {
  type: 'approval_request_created' | 'chat_created' | 'chat_deleted' | 'group_created' | 'group_updated' | 'presence_update' | 'chat_list_message' | 'chat_list_read' | 'chat_read_batch' | 'chat_list_delete' | 'edit' | 'error';
  message?: string;
  request_id?: Id;
  request_type?: 'direct_message' | 'group_invite';
  username?: string;
  user_id?: Id;
  is_online?: boolean;
  last_seen?: string | null;
  chat?: {
    chat_id: Id;
    name: string;
    user1: string;
    user2: string;
    user1_avatar_url?: string;
    user2_avatar_url?: string;
  };
  group?: {
    chat_id: Id;
    name: string;
    participants: string[];
  };
  chat_id?: Id;
  sender_id?: Id;
  reader_user_id?: Id;
  message_id?: Id;
  message_ids?: Id[];
  read_at?: string;
  new_content?: string;
  last_message?: ChatLastMessage | null;
  unread_count?: number;
  first_unread_message_id?: Id | null;
  timestamp?: string;
}

export type ChatOverride = Partial<Pick<Chat, 'last_message' | 'unread_count' | 'first_unread_message_id' | 'is_pinned'>> & {
  // Highest message ID already folded into unread_count; used to ignore duplicate or replayed events.
  last_counted_message_id?: Id;
  // When the override was written; overrides older than a server fetch are dropped.
  updated_at?: number;
};
export type ChatOverrideMap = Record<Id, ChatOverride>;

export interface PresenceInfo {
  is_online: boolean;
  last_seen: string | null;
}
export type PresenceMap = Record<string, PresenceInfo>;

export interface ChatContextMenuState {
  x: number;
  y: number;
  chatId: Id;
  isPinned: boolean;
  unreadCount: number;
}

export interface ChatListModal {
  type: 'error' | 'success' | 'validation' | 'deletedUser';
  message: string;
  onConfirm?: () => void;
}
