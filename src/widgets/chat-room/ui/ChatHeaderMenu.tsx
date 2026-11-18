import { useState } from 'react';
import { Flag, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { EntityId } from '@/shared/api/entityId';
import { ReportUserDialog } from '@/features/moderation';

interface ChatHeaderMenuProps {
  userId: EntityId;
  name: string;
}

export const ChatHeaderMenu = ({ userId, name }: ChatHeaderMenuProps) => {
  const { translations } = useLanguage();
  const [reportOpen, setReportOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={translations.profileRework.more} title={translations.profileRework.more}
            className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent">
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" />{translations.moderation.report}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {reportOpen && <ReportUserDialog userId={userId} name={name} onClose={() => setReportOpen(false)} />}
    </>
  );
};
