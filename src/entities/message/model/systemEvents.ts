import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { SystemEventInfo } from './types';

export const systemEventText = (event: SystemEventInfo, translations: Translations, isMe: (id?: EntityId | null) => boolean) => {
  const actorIsMe = isMe(event.actor_id);
  const targetIsMe = isMe(event.target_id);
  const fill = (template: string) => template
    .replace('{actor}', event.actor_name || translations.systemSomeone)
    .replace('{target}', event.target_name || translations.systemSomeone);
  switch (event.kind) {
    case 'group_created': return fill(actorIsMe ? translations.systemGroupCreatedYou : translations.systemGroupCreated);
    case 'member_added':
      if (actorIsMe) return fill(translations.systemMemberAddedByYou);
      return fill(targetIsMe ? translations.systemMemberAddedYou : translations.systemMemberAdded);
    case 'member_joined': return fill(actorIsMe ? translations.systemMemberJoinedYou : translations.systemMemberJoined);
    case 'member_removed': return fill(actorIsMe ? translations.systemMemberRemovedByYou : translations.systemMemberRemoved);
    case 'member_left': return fill(actorIsMe ? translations.systemMemberLeftYou : translations.systemMemberLeft);
    default: return '';
  }
};
