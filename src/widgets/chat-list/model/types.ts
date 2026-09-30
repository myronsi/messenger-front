import { Chat, ChatLastMessage } from '@/entities/message';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import type { useLanguage } from '@/shared/contexts/LanguageContext';

// Derived from useLanguage's return type so the widget always matches the
// active language bundle's shape without depending on its internal type name.
export type Translations = ReturnType<typeof useLanguage>['translations'];

export const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getMediaSrc = (path?: string | null, fallback: string = DEFAULT_AVATAR) => {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path}`;
};

export interface ChatsListComponentProps {
  username: string;
  onChatOpen: (
    chatId: number,
    chatName: string,
    interlocutorDeleted: boolean,
    type: 'one-on-one' | 'group',
    chatDisplayName?: string,
    isOnline?: boolean,
    lastSeen?: string | null,
    firstUnreadMessageId?: number | null,
    avatarUrl?: string,
    pendingApprovalRequest?: boolean,
    pendingApprovalMessage?: string,
  ) => void;
  setIsProfileOpen: (open: boolean) => void;
  activeChatId?: number;
  activeChatName?: string;
  onActiveChatUpdate?: (chat: Chat) => void;
  onChatDeleted?: (chatId: number) => void;
}

// WebSocket message interface
export interface WebSocketMessage {
  type: 'approval_request_created' | 'chat_created' | 'chat_deleted' | 'group_created' | 'group_updated' | 'presence_update' | 'chat_list_message' | 'chat_list_read' | 'chat_read_batch' | 'chat_list_delete' | 'edit' | 'error';
  message?: string;
  request_id?: number;
  request_type?: 'direct_message' | 'group_invite';
  username?: string;
  user_id?: number;
  is_online?: boolean;
  last_seen?: string | null;
  chat?: {
    chat_id: number;
    name: string;
    user1: string;
    user2: string;
    user1_avatar_url?: string;
    user2_avatar_url?: string;
  };
  group?: {
    chat_id: number;
    name: string;
    participants: string[];
  };
  chat_id?: number;
  sender_id?: number;
  reader_user_id?: number;
  message_id?: number;
  message_ids?: number[];
  read_at?: string;
  new_content?: string;
  last_message?: ChatLastMessage | null;
  unread_count?: number;
  first_unread_message_id?: number | null;
  timestamp?: string;
}

export type ChatOverride = Partial<Pick<Chat, 'last_message' | 'unread_count' | 'first_unread_message_id' | 'is_pinned'>>;
export type ChatOverrideMap = Record<number, ChatOverride>;

export interface PresenceInfo {
  is_online: boolean;
  last_seen: string | null;
}
export type PresenceMap = Record<string, PresenceInfo>;

export interface ChatContextMenuState {
  x: number;
  y: number;
  chatId: number;
  isPinned: boolean;
  unreadCount: number;
}

export interface ChatListModal {
  type: 'error' | 'success' | 'validation' | 'deletedUser';
  message: string;
  onConfirm?: () => void;
}
