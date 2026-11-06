import { getApiBaseUrl } from '@/shared/api/config';
import type { EntityId } from '@/shared/api/entityId';
import { Chat, ChatLastMessage } from '@/entities/message';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { useLanguage } from '@/shared/contexts/LanguageContext';

// Derived from useLanguage's return type so the widget always matches the
// active language bundle's shape without depending on its internal type name.
export type Translations = ReturnType<typeof useLanguage>['translations'];

export const BASE_URL = getApiBaseUrl();

export const getMediaSrc = (path?: string | null, fallback: string = DEFAULT_AVATAR) => resolveMediaUrl(path, fallback);

export interface ChatsListComponentProps {
  username: string;
  onChatOpen: (
    chatId: EntityId,
    chatName: string,
    interlocutorDeleted: boolean,
    type: 'one-on-one' | 'group',
    chatDisplayName?: string,
    isOnline?: boolean,
    lastSeen?: string | null,
    firstUnreadMessageId?: EntityId | null,
    avatarUrl?: string,
    pendingApprovalRequest?: boolean,
    pendingApprovalMessage?: string,
  ) => void;
  setIsProfileOpen: (open: boolean) => void;
  activeChatId?: EntityId;
  activeChatName?: string;
  onActiveChatUpdate?: (chat: Chat) => void;
  onChatDeleted?: (chatId: EntityId) => void;
}

// WebSocket message interface
export interface WebSocketMessage {
  type: 'security_notice' | 'approval_request_created' | 'chat_created' | 'chat_deleted' | 'group_created' | 'group_updated' | 'presence_update' | 'chat_list_message' | 'chat_list_read' | 'chat_read_batch' | 'chat_list_delete' | 'edit' | 'error';
  message?: string;
  request_id?: EntityId;
  request_type?: 'direct_message' | 'group_invite';
  username?: string;
  user_id?: EntityId;
  is_online?: boolean;
  last_seen?: string | null;
  chat?: {
    chat_id: EntityId;
    name: string;
    user1: string;
    user2: string;
    user1_avatar_url?: string;
    user2_avatar_url?: string;
  };
  group?: {
    chat_id: EntityId;
    name: string;
    participants: string[];
  };
  chat_id?: EntityId;
  sender_id?: EntityId;
  reader_user_id?: EntityId;
  message_id?: EntityId;
  message_ids?: EntityId[];
  read_at?: string;
  new_content?: string;
  last_message?: ChatLastMessage | null;
  unread_count?: number;
  first_unread_message_id?: EntityId | null;
  timestamp?: string;
}

export type ChatOverride = Partial<Pick<Chat, 'last_message' | 'unread_count' | 'first_unread_message_id' | 'is_pinned'>> & {
  // Highest message ID already folded into unread_count; used to ignore duplicate or replayed events.
  last_counted_message_id?: EntityId;
  // When the override was written; overrides older than a server fetch are dropped.
  updated_at?: number;
};
export type ChatOverrideMap = Record<EntityId, ChatOverride>;

export interface PresenceInfo {
  is_online: boolean;
  last_seen: string | null;
}
export type PresenceMap = Record<string, PresenceInfo>;

export interface ChatContextMenuState {
  x: number;
  y: number;
  chatId: EntityId;
  isPinned: boolean;
  unreadCount: number;
}

export interface ChatListModal {
  type: 'error' | 'success' | 'validation' | 'deletedUser';
  message: string;
  onConfirm?: () => void;
}
