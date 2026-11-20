import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { PublicCard } from '@/shared/ui/profile/PublicCard';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { localeOf } from '@/shared/lang/languages';
import { toast } from '@/shared/ui/sonner';
import { useJoinGroupMutation, type GroupPreview } from '@/entities/group';
import { joinErrorOf, type JoinError } from '../model/joinErrors';
import { useOpenGroupChat } from '../model/useOpenGroupChat';

interface GroupJoinCardProps {
  preview: GroupPreview;
  token?: string;
  name?: string;
  onDone?: () => void;
}

export const GroupJoinCard = ({ preview, token, name, onDone }: GroupJoinCardProps) => {
  const { translations, language } = useLanguage();
  const t = translations.sharing;
  const openChat = useOpenGroupChat();
  const [join, { isLoading }] = useJoinGroupMutation();
  const [error, setError] = useState<JoinError | null>(null);
  const { group, chat_id: chatId } = preview;
  const category = new Intl.PluralRules(localeOf(language)).select(group.member_count) as keyof typeof t.members;
  const members = (t.members[category] ?? t.members.other).replace('{count}', String(group.member_count));
  const messages: Record<JoinError, string> = {
    not_found: t.inviteNotAvailable, banned: t.joinBanned, restricted: t.joinRestricted, too_many: t.joinTooMany, failed: t.joinFailed,
  };
  const submit = async () => {
    setError(null);
    try {
      const chat = await join(token ? { token } : { name }).unwrap();
      toast(fillTemplate(t.joined, { name: chat.name || group.name }));
      openChat(chat.id, chat.name || group.name);
      onDone?.();
    } catch (caught) {
      setError(joinErrorOf(caught));
    }
  };
  return (
    <PublicCard seed={group.public_name || group.name} name={group.name} avatarUrl={group.avatar_url} text={group.description}
      subtitle={<>{group.public_name && <><span>@{group.public_name}</span><span aria-hidden="true">·</span></>}<span>{members}</span></>}>
      {error && <p role="alert" className="text-sm text-destructive">{messages[error]}</p>}
      {chatId ? (
        <>
          <p className="text-sm text-muted-foreground">{t.alreadyMember}</p>
          <Button type="button" onClick={() => { openChat(chatId, group.name); onDone?.(); }}>{t.openChat}</Button>
        </>
      ) : (
        <Button type="button" onClick={() => void submit()} disabled={isLoading || error === 'banned' || error === 'not_found'}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{isLoading ? t.joining : t.join}
        </Button>
      )}
    </PublicCard>
  );
};
