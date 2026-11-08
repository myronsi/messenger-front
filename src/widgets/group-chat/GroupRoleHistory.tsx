import React, { useEffect } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useGetGroupRoleLogQuery, type GroupRoleEvent } from '@/entities/chat';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { parseUtcDate } from '@/shared/utils/dateFormatters';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { localeOf } from '@/shared/lang/languages';

interface Props {
  chatId: EntityId;
  rolesKey: string;
}

const GroupRoleHistory: React.FC<Props> = ({ chatId, rolesKey }) => {
  const { translations, language } = useLanguage();
  const { currentData: data, isError, refetch } = useGetGroupRoleLogQuery(chatId, { refetchOnMountOrArgChange: true });
  useEffect(() => { refetch(); }, [refetch, rolesKey]);
  const items = data?.items ?? [];
  const formatter = new Intl.DateTimeFormat(localeOf(language), { dateStyle: 'short', timeStyle: 'short' });
  const describe = (event: GroupRoleEvent) => {
    const templates = {
      owner: translations.roleMadeOwner, admin: translations.roleMadeAdmin, moderator: translations.roleMadeModerator, member: translations.roleMadeMember,
    };
    return fillTemplate(templates[event.role], {
      actor: event.actor?.display_name || translations.systemSomeone,
      target: event.target.display_name || event.target.username,
    });
  };

  if (!data) return <p className="text-sm text-muted-foreground">{isError ? translations.roleHistoryError : translations.loading}</p>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{translations.roleHistoryEmpty}</p>;
  return (
    <ul data-testid="group-role-history" aria-label={translations.roleHistory}
      className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {items.map((event) => (
        <li key={event.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
          <span className="break-words text-foreground">{describe(event)}</span>
          <time dateTime={event.created_at} className="text-xs text-muted-foreground">{formatter.format(parseUtcDate(event.created_at))}</time>
        </li>
      ))}
    </ul>
  );
};

export default GroupRoleHistory;
