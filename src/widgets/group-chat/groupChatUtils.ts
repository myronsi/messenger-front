import type { GroupRole } from './GroupProfileTypes';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { localeOf } from '@/shared/lang/languages';


export const permissionsForRole = (role?: GroupRole | null) => ({
  can_edit_group: role === 'owner' || role === 'admin',
  can_manage_participants: role === 'owner' || role === 'admin',
  can_assign_roles: role === 'owner' || role === 'admin',
  can_delete_any_message: role === 'owner' || role === 'admin' || role === 'moderator',
  can_delete_group: role === 'owner',
  can_transfer_ownership: role === 'owner',
});


export const getAvatarSrc = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl);

const PARTICIPANT_KEYS: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'participantsCountOne', few: 'participantsCountFew', many: 'participantsCountMany', other: 'participantsCountOther',
};

export const participantCountLabel = (count: number, translations: Record<string, unknown>, language: string) => {
  const key = PARTICIPANT_KEYS[new Intl.PluralRules(localeOf(language)).select(count)] ?? 'participantsCountOther';
  const template = translations[key] ?? translations.participantsCountOther;
  return typeof template === 'string' ? template.replace('{count}', String(count)) : String(count);
};
