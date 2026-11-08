import type { GroupRole } from './GroupProfileTypes';
import type { GroupTranslations } from './groupChatTypes';

export const roleLabel = (role: GroupRole, translations: GroupTranslations) => {
  if (role === 'owner') return translations.owner || 'Owner';
  if (role === 'admin') return translations.admin || 'Admin';
  if (role === 'moderator') return translations.moderator || 'Moderator';
  return translations.member || 'Member';
};

export const roleTone = (role: GroupRole) => {
  if (role === 'owner') return 'bg-warning-soft text-warning';
  if (role === 'admin') return 'bg-primary/15 text-primary';
  if (role === 'moderator') return 'bg-success-soft text-success';
  return 'bg-muted text-subtle-foreground';
};
