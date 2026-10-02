import { mediaUrl } from '@/shared/utils/mediaUrl';

export const MAX_WEBSOCKET_RECONNECT_ATTEMPTS = 5;

export const escapeCurlyBraces = (text: string) => text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
export const unescapeCurlyBraces = (text: string) => text.replace(/\\{/g, '{').replace(/\\}/g, '}');

export const normalizeAvatarUrl = (avatarUrl?: string | null) => mediaUrl(avatarUrl);
