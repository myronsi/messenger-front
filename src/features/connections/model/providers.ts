import type { ConnectionProvider } from '../api/connectionsApi';

export const CODE_PROVIDERS: readonly ConnectionProvider[] = ['bluesky', 'mastodon', 'website'];

export const PROVIDER_NAMES: Record<ConnectionProvider, string> = {
  github: 'GitHub',
  spotify: 'Spotify',
  steam: 'Steam',
  xbox: 'Xbox',
  discord: 'Discord',
  twitch: 'Twitch',
  youtube: 'YouTube',
  reddit: 'Reddit',
  roblox: 'Roblox',
  tiktok: 'TikTok',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  website: 'Website',
};

export const isCodeProvider = (provider: ConnectionProvider) => CODE_PROVIDERS.includes(provider);

export const providerName = (provider: string) => PROVIDER_NAMES[provider as ConnectionProvider] ?? provider;

export type ConnectionResult = 'connected' | 'denied' | 'failed' | 'limit';

const RESULTS: readonly ConnectionResult[] = ['connected', 'denied', 'failed', 'limit'];

export const readConnectionResult = (search: string): { provider: string; result: ConnectionResult } | null => {
  const params = new URLSearchParams(search);
  const provider = params.get('provider');
  const result = params.get('result');
  if (!provider || !result || !(RESULTS as readonly string[]).includes(result)) return null;
  return { provider, result: result as ConnectionResult };
};

export const moveItem = <T>(items: readonly T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};
