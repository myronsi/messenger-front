import React, { useEffect } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useGetGroupRoleLogQuery, type GroupRoleEvent } from '@/entities/chat';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { parseUtcDate } from '@/shared/utils/dateFormatters';

interface Props {
  chatId: EntityId;
  rolesKey: string;
}

const GroupRoleHistory: React.FC<Props> = ({ chatId, rolesKey }) => {
  const { translations, language } = useLanguage();
  const { data, refetch } = useGetGroupRoleLogQuery(chatId, { refetchOnMountOrArgChange: true });
  useEffect(() => { refetch(); }, [refetch, rolesKey]);
  const items = data?.items ?? [];
  const formatter = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });
  const describe = (event: GroupRoleEvent) => {
    const templates = {
      owner: translations.roleMadeOwner, admin: translations.roleMadeAdmin, moderator: translations.roleMadeModerator, member: translations.roleMadeMember,
    };
    const template = templates[event.role];
    return template
      .replace('{actor}', event.actor?.display_name || translations.systemSomeone)
      .replace('{target}', event.target.display_name || event.target.username);
  };

  return (
    <section data-testid="group-role-history" className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">{translations.roleHistory}</div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{translations.roleHistoryEmpty}</p>
      ) : (
        <ul className="max-h-60 space-y-2 overflow-y-auto">
          {items.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 break-words text-gray-900">{describe(event)}</span>
              <time dateTime={event.created_at} className="shrink-0 text-xs text-gray-500">{formatter.format(parseUtcDate(event.created_at))}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default GroupRoleHistory;
