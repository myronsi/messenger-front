import type { UserAvatarHistoryItem } from '@/entities/user';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

export interface AvatarListItem extends UserAvatarHistoryItem {
  fullUrl: string;
}

const isDefaultAvatar = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl) === DEFAULT_AVATAR;

export const buildAvatarList = (history: UserAvatarHistoryItem[], currentAvatarUrl: string): AvatarListItem[] => {
  const hasCurrentAvatar = !isDefaultAvatar(currentAvatarUrl);
  const normalizedHistory = history
    .map((avatar) => ({
      ...avatar,
      fullUrl: avatar.is_current && hasCurrentAvatar ? currentAvatarUrl : resolveMediaUrl(avatar.avatar_url),
    }))
    .filter((avatar) => !isDefaultAvatar(avatar.avatar_url));
  if (!hasCurrentAvatar) return normalizedHistory;
  const currentExists = normalizedHistory.some((avatar) => avatar.is_current || avatar.fullUrl === currentAvatarUrl);
  if (currentExists) return normalizedHistory;
  return [
    { id: 0, avatar_url: currentAvatarUrl, created_at: '', is_current: true, fullUrl: currentAvatarUrl },
    ...normalizedHistory,
  ];
};
