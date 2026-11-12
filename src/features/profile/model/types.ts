import type { User } from '@/entities/user';
import type { ApproximateLocation } from '@/shared/lib/locationLabel';

export type BasicPrivacyVisibility = 'everyone' | 'shared_chats';
export type ExceptionPrivacyVisibility = BasicPrivacyVisibility | 'everyone_except' | 'nobody_except' | 'nobody';
export type PresencePrivacyVisibility = ExceptionPrivacyVisibility | 'nobody';
export type DirectMessagePrivacyVisibility = BasicPrivacyVisibility | 'wait_approval';
export type GroupInvitePrivacyVisibility = PresencePrivacyVisibility | 'wait_approval';
export type PrivacyVisibility = PresencePrivacyVisibility | 'wait_approval';
export type SearchVisibility = 'everyone' | 'nobody';
export type PrivacyExceptionKey = 'avatar_visibility' | 'profile_visibility' | 'presence_visibility' | 'last_seen_visibility' | 'group_invites' | 'direct_messages' | 'search_visibility';
export type PrivacyExceptionEffect = 'allow' | 'deny';
export type PrivacyExceptionLists = Record<PrivacyExceptionKey, Record<PrivacyExceptionEffect, User[]>>;

export interface PrivacySettings {
  avatar_visibility: ExceptionPrivacyVisibility;
  profile_visibility: ExceptionPrivacyVisibility;
  presence_visibility: PresencePrivacyVisibility;
  last_seen_visibility: PresencePrivacyVisibility;
  read_receipts_enabled: boolean;
  calls_enabled: boolean;
  typing_indicators_enabled: boolean;
  direct_messages: DirectMessagePrivacyVisibility;
  group_invites: GroupInvitePrivacyVisibility;
  search_visibility: SearchVisibility;
  privacy_exceptions: PrivacyExceptionLists;
}

export interface SecuritySettings {
  session_duration_days: number;
  two_factor_enabled: boolean;
}

export interface UserSession {
  id: string;
  user_agent: string;
  location?: ApproximateLocation | null;
  created_at: string;
  last_active_at: string;
  expires_at?: string;
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
