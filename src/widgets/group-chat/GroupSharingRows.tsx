import React from 'react';
import { Ban, ChevronRight, Globe, Link2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupSharingView } from './GroupSharingPage';

interface Props {
  publicName: string | null;
  onOpen: (view: GroupSharingView) => void;
}

const GroupSharingRows: React.FC<Props> = ({ publicName, onOpen }) => {
  const t = useLanguage().translations.sharing;
  const rows: { view: GroupSharingView; label: string; icon: typeof Link2; value?: string }[] = [
    { view: 'invites', label: t.inviteLinks, icon: Link2 },
    { view: 'public', label: t.publicGroup, icon: Globe, value: publicName ? `@${publicName}` : undefined },
    { view: 'bans', label: t.removedMembers, icon: Ban },
  ];
  return (
    <section data-testid="group-sharing-rows" className="overflow-hidden rounded-lg border border-border bg-card">
      {rows.map(({ view, label, icon: Icon, value }) => (
        <button key={view} type="button" onClick={() => onOpen(view)}
          className="flex min-h-[48px] w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/60">
          <Icon className="h-5 w-5 shrink-0 text-subtle-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{label}</span>
          {value && <span className="max-w-[45%] truncate text-sm text-muted-foreground">{value}</span>}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
    </section>
  );
};

export default GroupSharingRows;
