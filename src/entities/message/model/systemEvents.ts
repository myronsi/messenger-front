import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { CallSummaryInfo, SystemEventInfo } from './types';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { formatCallDuration } from '@/shared/lib/callDuration';

const callText = (call: CallSummaryInfo | undefined, translations: Translations, actorIsMe: boolean) => {
  if (!call) return translations.systemCallMissed;
  switch (call.outcome) {
    case 'completed': return fillTemplate(call.kind === 'group' ? translations.systemGroupCallCompleted : translations.systemCallCompleted, {
      duration: formatCallDuration(call.duration_seconds ?? 0),
    });
    case 'missed': return actorIsMe ? translations.systemCallNoAnswer : translations.systemCallMissed;
    case 'declined': return actorIsMe ? translations.systemCallDeclined : translations.systemCallDeclinedYou;
    case 'cancelled': return actorIsMe ? translations.systemCallCancelled : translations.systemCallMissed;
    case 'failed': return translations.systemCallFailed;
    default: return translations.systemCallMissed;
  }
};

const pinText = (event: SystemEventInfo, translations: Translations, actorIsMe: boolean) => {
  const t = translations.messagePins;
  const pinned = event.kind === 'message_pinned';
  const kind = event.message_type === 'voice' || event.message_type === 'sticker' ? t.kinds[event.message_type] : t.kinds.message;
  const template = event.snippet
    ? (pinned ? (actorIsMe ? t.systemPinnedYou : t.systemPinned) : (actorIsMe ? t.systemUnpinnedYou : t.systemUnpinned))
    : (pinned ? (actorIsMe ? t.systemPinnedKindYou : t.systemPinnedKind) : (actorIsMe ? t.systemUnpinnedKindYou : t.systemUnpinnedKind));
  return fillTemplate(template, { actor: event.actor_name || translations.systemSomeone, snippet: event.snippet ?? '', kind });
};

export const systemEventText =(event: SystemEventInfo, translations: Translations, isMe: (id?: EntityId | null) => boolean) => {
  const actorIsMe = isMe(event.actor_id);
  const targetIsMe = isMe(event.target_id);
  const fill = (template: string) => fillTemplate(template, {
    actor: event.actor_name || translations.systemSomeone,
    target: event.target_name || translations.systemSomeone,
  });
  switch (event.kind) {
    case 'group_created': return fill(actorIsMe ? translations.systemGroupCreatedYou : translations.systemGroupCreated);
    case 'member_added':
      if (actorIsMe) return fill(translations.systemMemberAddedByYou);
      return fill(targetIsMe ? translations.systemMemberAddedYou : translations.systemMemberAdded);
    case 'member_joined': return fill(actorIsMe ? translations.systemMemberJoinedYou : translations.systemMemberJoined);
    case 'member_removed': return fill(actorIsMe ? translations.systemMemberRemovedByYou : translations.systemMemberRemoved);
    case 'member_left': return fill(actorIsMe ? translations.systemMemberLeftYou : translations.systemMemberLeft);
    case 'call': return callText(event.call, translations, actorIsMe);
    case 'message_pinned': case 'message_unpinned': return pinText(event, translations, actorIsMe);
    default: return '';
  }
};

export { isContentLabel, useChatFormatters } from './chatFormatters';
