import React, { useRef } from 'react';
import { AtSign } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useGetGroupChatsQuery } from '@/entities/chat';
import { useLazyGetUnreadMentionsQuery } from '@/entities/group';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { localeOf } from '@/shared/lang/languages';

interface Props {
  chatId: EntityId;
  username: string;
  onJump: (messageId: EntityId) => void;
}

const MAX_BADGE = 99;

const MentionJumpButton: React.FC<Props> = ({ chatId, username, onJump }) => {
  const { translations, language } = useLanguage();
  const t = translations.sharing;
  const { count } = useGetGroupChatsQuery(username, {
    skip: !username,
    selectFromResult: ({ data }) => ({ count: data?.groups.find((group) => String(group.chat_id) === String(chatId))?.unread_mentions_count ?? 0 }),
  });
  const [load, { isFetching }] = useLazyGetUnreadMentionsQuery();
  const visited = useRef(new Set<string>());
  if (count <= 0) return null;
  const jump = async () => {
    const ids = await load(chatId).unwrap().catch(() => [] as EntityId[]);
    const next = ids.find((id) => !visited.current.has(String(id))) ?? ids[0];
    if (next === undefined) return;
    visited.current.add(String(next));
    onJump(next);
  };
  const words = t.unreadMentions;
  const category = new Intl.PluralRules(localeOf(language)).select(count) as keyof typeof words;
  const label = `${t.jumpToMention}, ${(words[category] ?? words.other).replace('{count}', String(count))}`;
  return (
    <button type="button" data-testid="mention-jump" aria-label={label} title={label} disabled={isFetching} onClick={() => void jump()}
      className="pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/85 text-primary shadow-lg shadow-foreground/15 backdrop-blur-xl transition-colors hover:bg-background">
      <AtSign className="h-5 w-5" aria-hidden="true" />
      <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full bg-primary px-1 text-center text-xs font-semibold leading-5 text-primary-foreground ring-2 ring-background">
        {count > MAX_BADGE ? `${MAX_BADGE}+` : count}
      </span>
    </button>
  );
};

export default MentionJumpButton;
