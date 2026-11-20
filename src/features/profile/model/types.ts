import type { User } from '@/entities/user';
import type { ApproximateLocation } from '@/shared/lib/locationLabel';

export type BasicPrivacyVisibility = 'everyone' | 'shared_chats';
export type ExceptionPrivacyVisibility = BasicPrivacyVisibility | 'nobody';
export type PresencePrivacyVisibility = ExceptionPrivacyVisibility;
export type DirectMessagePrivacyVisibility = BasicPrivacyVisibility | 'wait_approval' | 'nobody';
export type GroupInvitePrivacyVisibility = PresencePrivacyVisibility | 'wait_approval';
export type CallsPrivacyVisibility = ExceptionPrivacyVisibility;
export type PrivacyVisibility = PresencePrivacyVisibility | 'wait_approval';
export type SearchVisibility = 'everyone' | 'nobody';
export type ForwardLinkVisibility = BasicPrivacyVisibility | 'nobody';
export type PrivacyExceptionKey = 'avatar_visibility' | 'profile_visibility' | 'presence_visibility' | 'last_seen_visibility' | 'birthday_visibility'
  | 'group_invites' | 'direct_messages' | 'search_visibility' | 'calls_from' | 'voice_video_messages' | 'forward_link';
export type PrivacyExceptionEffect = 'allow' | 'deny';
export type PrivacyExceptionLists = Record<PrivacyExceptionKey, Record<PrivacyExceptionEffect, User[]>>;

export interface PrivacySettings {
  avatar_visibility: ExceptionPrivacyVisibility;
  profile_visibility: ExceptionPrivacyVisibility;
  presence_visibility: PresencePrivacyVisibility;
  last_seen_visibility: PresencePrivacyVisibility;
  birthday_visibility: PresencePrivacyVisibility;
  read_receipts_enabled: boolean;
  calls_from: CallsPrivacyVisibility;
  typing_indicators_enabled: boolean;
  direct_messages: DirectMessagePrivacyVisibility;
  group_invites: GroupInvitePrivacyVisibility;
  search_visibility: SearchVisibility;
  web_profile_visibility: SearchVisibility;
  voice_video_messages: BasicPrivacyVisibility;
  forward_link: ForwardLinkVisibility;
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
