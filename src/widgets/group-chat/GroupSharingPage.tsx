import React, { useEffect, useRef, useState } from 'react';
import { Ban, Globe, Link2 } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { windowSlide } from '@/shared/ui/windowMotion';
import { GroupBansPanel, InviteLinksPanel, PublicNamePanel } from '@/features/sharing';

export type GroupSharingView = 'invites' | 'public' | 'bans';

interface Props {
  view: GroupSharingView;
  chatId: EntityId;
  groupName: string;
  publicName: string | null;
  onBack: () => void;
  closing?: boolean;
}

const GroupSharingPage: React.FC<Props> = ({ view, chatId, groupName, publicName, onBack, closing = false }) => {
  const { translations } = useLanguage();
  const t = translations.sharing;
  const backButton = useRef<HTMLButtonElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    backButton.current?.focus({ preventScroll: true });
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const title = { invites: t.inviteLinks, public: t.publicGroup, bans: t.removedMembers }[view];
  const Icon = { invites: Link2, public: Globe, bans: Ban }[view];
  return (
    <section
      aria-label={title}
      data-closing={closing || undefined}
      className={`absolute inset-0 z-20 flex flex-col bg-background text-foreground shadow-xl ${windowSlide(entered && !closing)}`}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onBack();
      }}
    >
      <PageBackHeader ref={backButton} onBack={onBack}>
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink asChild className="cursor-pointer truncate">
                <button type="button" onClick={onBack}>{translations.groupProfile}</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="inline-flex items-center gap-2 truncate font-medium">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {view === 'invites' && <InviteLinksPanel chatId={chatId} groupName={groupName} />}
        {view === 'public' && <PublicNamePanel chatId={chatId} groupName={groupName} publicName={publicName} />}
        {view === 'bans' && <GroupBansPanel chatId={chatId} />}
      </div>
    </section>
  );
};

export default GroupSharingPage;
