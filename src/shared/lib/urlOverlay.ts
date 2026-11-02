export const SETTINGS_PAGES = ['profile', 'personal', 'privacy', 'security', 'notifications', 'requests'] as const;
export type SettingsPage = typeof SETTINGS_PAGES[number];

export type UrlOverlay =
  | { kind: 'settings'; page: SettingsPage }
  | { kind: 'profile' }
  | { kind: 'user'; username: string; overProfile?: boolean };

const isSettingsPage = (value: string): value is SettingsPage => (SETTINGS_PAGES as readonly string[]).includes(value);
const isChatBase = (base: string) => /^\/(?:dm|direct)\/[^/]+$/.test(base) || /^\/chat\/\d+$/.test(base);
const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const splitOverlayPath = (pathname: string): { base: string; overlay: UrlOverlay | null } => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

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
  const prefix = base === '/' ? '' : base.replace(/\/+$/, '');
  if (!overlay) return prefix || '/';
  if (overlay.kind === 'settings') return `${prefix}/settings${overlay.page === 'profile' ? '' : `/${overlay.page}`}`;
  if (overlay.kind === 'profile') return `${prefix}/profile`;
  return `${prefix}${overlay.overProfile ? '/profile' : ''}/@${encodeURIComponent(overlay.username.replace(/^@/, ''))}`;
};

export const isProfileOverlayOpen = (overlay: UrlOverlay | null) => (
  overlay?.kind === 'profile' || (overlay?.kind === 'user' && !!overlay.overProfile)
);

export const parentOverlay = (overlay: UrlOverlay | null): UrlOverlay | null => (
  overlay?.kind === 'user' && overlay.overProfile ? { kind: 'profile' } : null
);
