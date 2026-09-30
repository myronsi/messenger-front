const BASE_URL = import.meta.env.VITE_BASE_URL;

export const MAX_WEBSOCKET_RECONNECT_ATTEMPTS = 5;

export const escapeCurlyBraces = (text: string) => text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
export const unescapeCurlyBraces = (text: string) => text.replace(/\\{/g, '{').replace(/\\}/g, '}');

export const normalizeAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return `${BASE_URL}/static/avatars/default.jpg`;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  return `${BASE_URL}${avatarUrl}`;
};
