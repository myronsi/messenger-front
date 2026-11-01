import type { EntityId } from '@/shared/api/entityId';
export interface User {
  id: EntityId;
  username: string;
  display_name: string;
  account_display_name?: string;
  contact_display_name?: string | null;
  email?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string | null;
  is_online?: boolean;
  last_seen?: string | null;
  can_message?: boolean;
  direct_chat_id?: EntityId | null;
  direct_message_reason?: 'self' | 'blocked' | 'privacy' | null;
}

export interface UserAvatarHistoryItem {
  id: EntityId;
  avatar_url: string;
  created_at: string;
  is_current: boolean;
}

export interface UserAvatarHistoryResponse {
  avatars: UserAvatarHistoryItem[];
}

export interface BlockedUsersResponse {
  users: User[];
}
