import { Lock, Undo2 } from 'lucide-react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { MenuAction } from '@/shared/ui/ContextMenuComponent';
import { isPollClosed, requestPollClose, submitPollVote, type Message } from '@/entities/message';

export const usePollMenuActions = (chatId: EntityId, message: Message | undefined, closeMenu: () => void): MenuAction[] => {
  const { translations } = useLanguage();
  const t = translations.polls;
  const poll = message && !message.is_deleted ? message.poll : undefined;
  if (!message || !poll || !isPersistedId(message.id) || !isPersistedId(chatId) || isPollClosed(poll)) return [];
  const target = { chatId, messageId: message.id };
  return [
    ...(!poll.quiz && poll.my_votes.length > 0
      ? [{ key: 'poll-retract', icon: Undo2, label: t.takeBack, onClick: () => { closeMenu(); void submitPollVote(target, [], t); } }] : []),
    ...(poll.can_close ? [{ key: 'poll-close', icon: Lock, label: t.closePoll, onClick: () => { closeMenu(); requestPollClose(target); } }] : []),
  ];
};
