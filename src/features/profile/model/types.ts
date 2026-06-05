import type { User } from '@/entities/user';

export interface UserAvatarHistoryItem {
  id: number;
  avatar_url: string;
  created_at: string;
  is_current: boolean;
}

export interface UserAvatarHistoryResponse {
  avatars: UserAvatarHistoryItem[];
}

export type PrivacyVisibility = 'everyone' | 'shared_chats' | 'nobody';
export type SearchVisibility = 'everyone' | 'nobody';

export interface PrivacySettings {
  avatar_visibility: PrivacyVisibility;
  profile_visibility: PrivacyVisibility;
  presence_visibility: PrivacyVisibility;
  read_receipts_enabled: boolean;
  direct_messages: PrivacyVisibility;
  group_invites: PrivacyVisibility;
  search_visibility: SearchVisibility;
}

export interface BlockedUsersResponse {
  users: User[];
}

export interface SecuritySettings {
  session_duration_days: number;
  two_factor_enabled: boolean;
  recovery_codes_remaining: number;
}

export interface UserSession {
  id: string;
  user_agent: string;
  ip_address?: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface UserSessionsResponse {
  sessions: UserSession[];
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauth_uri: string;
}

export interface TwoFactorConfirmResponse {
  message: string;
  recovery_codes: string[];
}
