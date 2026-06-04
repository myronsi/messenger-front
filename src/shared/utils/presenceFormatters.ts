import { parseUtcDate } from './dateFormatters';

export const getPresenceLabel = (isOnline?: boolean, lastSeen?: string | null) => {
  if (isOnline) return 'online';
  if (!lastSeen) return 'offline';

  const lastSeenDate = parseUtcDate(lastSeen);
  if (Number.isNaN(lastSeenDate.getTime())) return 'offline';

  const diffMs = Date.now() - lastSeenDate.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'last seen just now';
  if (diffMinutes < 60) return `last seen ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `last seen ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'last seen yesterday';
  if (diffDays < 7) return `last seen ${diffDays} days ago`;

  return `last seen ${lastSeenDate.toLocaleDateString()}`;
};
