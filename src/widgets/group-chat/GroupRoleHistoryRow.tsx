import React from 'react';
import { ChevronRight, History } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useGetGroupRoleLogQuery } from '@/entities/chat';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';

interface Props {
  chatId: EntityId;
  onOpen: () => void;
}

const GroupRoleHistoryRow: React.FC<Props> = ({ chatId, onOpen }) => {
  const { translations } = useLanguage();
  const { currentData: data } = useGetGroupRoleLogQuery(chatId);
  const count = data?.items.length;
  return (
    <button type="button" onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-accent/50">
      <History className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{translations.roleHistory}</span>
      {count !== undefined && (
        <span className="shrink-0 text-sm text-muted-foreground">{fillTemplate(translations.roleHistoryCount, { count: String(count) })}</span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
};

export default GroupRoleHistoryRow;
