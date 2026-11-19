import { ShieldAlert } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { formatDate } from '@/shared/utils/dateFormatters';
import { toast } from '@/shared/ui/sonner';
import { useAppealAccountStatusMutation, useGetAccountStatusQuery } from '../api/moderationApi';
import { restrictionLabel, statusLevel } from '../model/accountStatus';
import { ReviewRequestSection } from './ReviewRequestSection';

interface AccountStatusPageProps {
  onBack: () => void;
  hideBack?: boolean;
  isActive?: boolean;
}

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined);

const tone: Record<string, string> = {
  good: 'bg-success-soft text-success', warned: 'bg-warning-soft text-foreground', limited: 'bg-warning-soft text-foreground',
  restricted: 'bg-destructive-soft text-destructive', suspended: 'bg-destructive-soft text-destructive',
};

export const AccountStatusPage = ({ onBack, hideBack = false, isActive = true }: AccountStatusPageProps) => {
  const { translations, language } = useLanguage();
  const t = translations.moderation;
  const { data, isLoading, isError, refetch } = useGetAccountStatusQuery(undefined, { skip: !isActive });
  const [appeal, { isLoading: isAppealing }] = useAppealAccountStatusMutation();
  const level = statusLevel(data?.status);

  const submitAppeal = async () => {
    try {
      const next = await appeal().unwrap();
      toast(next.probation_until ? fillTemplate(t.appealDone, { date: formatDate(next.probation_until, language) }) : t.statuses[statusLevel(next.status)]);
    } catch (caught) {
      toast(statusOf(caught) === 409 ? t.appealNotAllowed : t.appealUnavailable);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <PageBackHeader onBack={onBack} hideBack={hideBack}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />{t.statusTitle}
            </BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {isLoading && <p role="status" className="text-sm text-muted-foreground">{translations.loading}</p>}
        {isError && !data && (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">{t.loadFailed}</p>
            <button type="button" onClick={() => void refetch()} className="rounded-md bg-secondary px-3 py-1.5 text-sm">{t.retry}</button>
          </div>
        )}
        {data && <>
          <section className="space-y-2">
            <span data-testid="account-status-level" className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${tone[level]}`}>{t.statuses[level]}</span>
            <p className="text-sm text-muted-foreground">{t.statusDescriptions[level]}</p>
            {data.since && level !== 'good' && <p className="text-xs text-muted-foreground">{fillTemplate(t.since, { date: formatDate(data.since, language) })}</p>}
            {data.probation_until && (
              <p className="text-xs font-medium">{fillTemplate(t.probationUntil, { date: formatDate(data.probation_until, language) })}</p>
            )}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t.restrictionsTitle}</h3>
            {data.restrictions.length === 0 ? <p className="text-sm text-muted-foreground">{t.noRestrictions}</p> : (
              <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="account-restrictions">
                {data.restrictions.map((item) => <li key={item}>{restrictionLabel(item, t)}</li>)}
              </ul>
            )}
          </section>
          {level !== 'good' && (
            <section className="space-y-2 rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold">{t.appealTitle}</h3>
              <p className="text-sm text-muted-foreground">{t.appealExplanation}</p>
              <button type="button" onClick={() => void submitAppeal()} disabled={!data.can_appeal || isAppealing}
                className="motion-press rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {t.appealButton}
              </button>
              {!data.can_appeal && <p className="text-xs text-muted-foreground">{t.appealUnavailable}</p>}
            </section>
          )}
          {level !== 'good' && <ReviewRequestSection status={data} />}
        </>}
      </div>
    </div>
  );
};
