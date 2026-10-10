import type { User } from '@/entities/user';
import type { Schema } from '@/shared/api/contract';

export type ExceptionPrivacyVisibility = Schema<'Visibility'>;
export type PresencePrivacyVisibility = Schema<'Visibility'>;
export type DirectMessagePrivacyVisibility = Schema<'DirectMessagePolicy'>;
export type GroupInvitePrivacyVisibility = Schema<'GroupInvitePolicy'>;
export type PrivacyVisibility = ExceptionPrivacyVisibility | DirectMessagePrivacyVisibility | GroupInvitePrivacyVisibility;
export type SearchVisibility = Schema<'SearchVisibility'>;
export type PrivacyExceptionKey = 'avatar_visibility' | 'profile_visibility' | 'presence_visibility' | 'group_invites';
export type PrivacyExceptionEffect = 'allow' | 'deny';
export type PrivacyExceptionLists = Record<PrivacyExceptionKey, Record<PrivacyExceptionEffect, User[]>>;

// The contract's PrivacySettings, with the exceptions' user ids resolved to users for display.
export type PrivacySettings = Omit<Schema<'PrivacySettings'>, 'exceptions'> & {
  privacy_exceptions: PrivacyExceptionLists;
};

export type SecuritySettings = Schema<'SecuritySettings'> & {
  // Known right after 2FA was confirmed (the contract has no endpoint that counts them).
  recovery_codes_remaining?: number;
};

// A session as the security settings list it.
export interface UserSession {
  id: string;
  user_agent: string;
  ip_address?: string | null;
  created_at: string;
  last_active_at: string;
  expires_at?: string;
  is_current: boolean;
}

export interface UserSessionsResponse {
  sessions: UserSession[];
}

export type TwoFactorSetupResponse = Schema<'TwoFactorSetup'>;
export type TwoFactorConfirmResponse = Schema<'TwoFactorRecoveryCodes'>;
