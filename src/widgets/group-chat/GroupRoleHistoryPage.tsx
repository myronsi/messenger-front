import React, { useEffect, useRef, useState } from 'react';
import { History } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { windowSlide } from '@/shared/ui/windowMotion';
import GroupRoleHistory from './GroupRoleHistory';

interface Props {
  chatId: EntityId;
  rolesKey: string;
  onBack: () => void;
  closing?: boolean;
}

const GroupRoleHistoryPage: React.FC<Props> = ({ chatId, rolesKey, onBack, closing = false }) => {
  const { translations } = useLanguage();
  const backButton = useRef<HTMLButtonElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    backButton.current?.focus({ preventScroll: true });
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return (
    <section
      aria-label={translations.roleHistory}
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
                <History className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {translations.roleHistory}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <GroupRoleHistory chatId={chatId} rolesKey={rolesKey} />
      </div>
    </section>
  );
};

export default GroupRoleHistoryPage;
