import type { GroupRole } from './GroupProfileTypes';
import type { GroupTranslations } from './groupChatTypes';

export const roleLabel = (role: GroupRole, translations: GroupTranslations) => {
  if (role === 'owner') return translations.owner || 'Owner';
  if (role === 'admin') return translations.admin || 'Admin';
  if (role === 'moderator') return translations.moderator || 'Moderator';
  return translations.member || 'Member';
};

export const roleTone = (role: GroupRole) => {
  if (role === 'owner') return 'bg-amber-100 text-amber-900';
  if (role === 'admin') return 'bg-blue-100 text-blue-900';
  if (role === 'moderator') return 'bg-emerald-100 text-emerald-900';
  return 'bg-gray-100 text-gray-600';
};
