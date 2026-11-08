import { trimTrailingSlashes } from './trimTrailingSlashes';

export const SETTINGS_PAGES = ['profile', 'personal', 'privacy', 'security', 'notifications', 'requests', 'language', 'about'] as const;
export type SettingsPage = typeof SETTINGS_PAGES[number];

export const PRIVACY_DETAILS = ['avatar_visibility', 'profile_visibility', 'presence_visibility', 'direct_messages', 'group_invites', 'search_visibility'] as const;
export type PrivacyDetail = typeof PRIVACY_DETAILS[number];

export const SECURITY_DETAILS = ['password', 'two-factor', 'passkeys', 'recovery-key', 'recovery-email', 'sessions', 'activity'] as const;
export type SecurityDetail = typeof SECURITY_DETAILS[number];

export type UrlOverlay =
  | { kind: 'settings'; page: SettingsPage; detail?: PrivacyDetail; exceptions?: 'allow' | 'deny'; securityDetail?: SecurityDetail }
  | { kind: 'profile' }
  | { kind: 'user'; username: string; overProfile?: boolean };

const isSettingsPage = (value: string): value is SettingsPage => (SETTINGS_PAGES as readonly string[]).includes(value);
const isPrivacyDetail = (value: string): value is PrivacyDetail => (PRIVACY_DETAILS as readonly string[]).includes(value);
const isSecurityDetail = (value: string): value is SecurityDetail => (SECURITY_DETAILS as readonly string[]).includes(value);
const isChatBase = (base: string) => /^\/(?:dm|direct)\/[^/]+$/.test(base) || /^\/chat\/\d+$/.test(base);
const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const splitOverlayPath = (pathname: string): { base: string; overlay: UrlOverlay | null } => {
  const path = pathname.length > 1 ? trimTrailingSlashes(pathname) : pathname;

  const privacy = path.match(/^(.*?)\/settings\/privacy\/([^/]+)(?:\/(allow|deny))?$/);
  if (privacy && (!privacy[1] || isChatBase(privacy[1])) && isPrivacyDetail(privacy[2])) {
    const exceptions = privacy[3] as 'allow' | 'deny' | undefined;
    return { base: privacy[1] || '/', overlay: { kind: 'settings', page: 'privacy', detail: privacy[2], ...(exceptions ? { exceptions } : {}) } };
  }

  const security = path.match(/^(.*?)\/settings\/security\/([^/]+)$/);
  if (security && (!security[1] || isChatBase(security[1])) && isSecurityDetail(security[2])) {
    return { base: security[1] || '/', overlay: { kind: 'settings', page: 'security', securityDetail: security[2] } };
  }

  const settings = path.match(/^(.*?)\/settings(?:\/([^/]+))?$/);
  if (settings && (!settings[1] || isChatBase(settings[1])) && (!settings[2] || (settings[2] !== 'profile' && isSettingsPage(settings[2])))) {
    return { base: settings[1] || '/', overlay: { kind: 'settings', page: (settings[2] as SettingsPage | undefined) || 'profile' } };
  }

  const profile = path.match(/^(.+)\/profile$/);
  if (profile && isChatBase(profile[1])) return { base: profile[1], overlay: { kind: 'profile' } };

  const user = path.match(/^(.*?)\/@([^/]+)$/);
  const username = user ? decode(user[2]).trim() : '';
  if (user && username && (!user[1] || isChatBase(user[1]))) {
    return { base: user[1] || '/', overlay: { kind: 'user', username } };
  }
  const stacked = user?.[1].match(/^(.+)\/profile$/);
  if (stacked && username && isChatBase(stacked[1])) {
    return { base: stacked[1], overlay: { kind: 'user', username, overProfile: true } };
  }

  return { base: path || '/', overlay: null };
};

export const joinOverlayPath = (base: string, overlay: UrlOverlay | null) => {
  const prefix = base === '/' ? '' : trimTrailingSlashes(base);
  if (!overlay) return prefix || '/';
  if (overlay.kind === 'settings') {
    const privacy = overlay.page === 'privacy' && overlay.detail ? `/${overlay.detail}${overlay.exceptions ? `/${overlay.exceptions}` : ''}` : '';
    const detail = overlay.page === 'security' && overlay.securityDetail ? `/${overlay.securityDetail}` : privacy;
    return `${prefix}/settings${overlay.page === 'profile' ? '' : `/${overlay.page}`}${detail}`;
  }
  if (overlay.kind === 'profile') return `${prefix}/profile`;
  return `${prefix}${overlay.overProfile ? '/profile' : ''}/@${encodeURIComponent(overlay.username.replace(/^@/, ''))}`;
};

export const isProfileOverlayOpen = (overlay: UrlOverlay | null) => (
  overlay?.kind === 'profile' || (overlay?.kind === 'user' && !!overlay.overProfile)
);

export const parentOverlay = (overlay: UrlOverlay | null): UrlOverlay | null => (
  overlay?.kind === 'user' && overlay.overProfile ? { kind: 'profile' } : null
);
