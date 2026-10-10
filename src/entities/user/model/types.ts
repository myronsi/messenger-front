import type { Schema } from '@/shared/api/contract';
import type { Id } from '@/shared/lib/ids';

export type ApiUser = Schema<'User'>;
export type ApiMe = Schema<'Me'>;
export type AvatarVersion = Schema<'AvatarVersion'>;

// The user as the app shows it (toUser builds it from the contract's User).
export interface User {
  id: Id;
  username: string;
  // The name to show: the viewer's contact name if they set one, else the user's own display name.
  display_name: string;
  // The user's own display name and the viewer's contact name.
  account_display_name?: string;
  contact_display_name?: string | null;
  // A host-relative API path; render it with MediaImg (it needs the access token).
  avatar_url?: string;
  bio?: string;
  created_at?: string | null;
  is_online?: boolean;
  last_seen?: string | null;
  is_deleted?: boolean;
  // Known only when the app looked it up: the direct chat with this user, and whether a new one may be
  // started (the server decides when it is created).
  direct_chat_id?: Id | null;
  can_message?: boolean;
  direct_message_reason?: 'self' | 'blocked' | 'privacy' | null;
}

export const toUser = (user: ApiUser | ApiMe): User => ({
  id: user.id,
  username: user.username,
  display_name: user.contact_name?.trim() || user.display_name,
  account_display_name: user.display_name,
  contact_display_name: user.contact_name ?? null,
  avatar_url: user.avatar_url ?? undefined,
  bio: user.bio ?? undefined,
  created_at: 'created_at' in user ? user.created_at : null,
  is_online: user.is_online,
  last_seen: user.last_seen,
  is_deleted: user.is_deleted,
});

export interface UserAvatarHistoryItem {
  id: Id;
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

export interface UserSearchResponse {
  users: User[];
}
