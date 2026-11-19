import { ShieldAlert, UserCheck } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { formatDate } from '@/shared/utils/dateFormatters';
import { toast } from '@/shared/ui/sonner';
import { useAppealAccountStatusMutation, useGetAccountStatusQuery, useListReportOutcomesQuery } from '../api/moderationApi';
import { decidedByStaff, decisionReasonLabel, outcomeNotice, restrictionLabel, statusLevel } from '../model/accountStatus';
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
  const { data: outcomes } = useListReportOutcomesQuery(undefined, { skip: !isActive });
  const [appeal, { isLoading: isAppealing }] = useAppealAccountStatusMutation();
  const level = statusLevel(data?.status);
  const staff = decidedByStaff(data);

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
            <p className="text-sm text-muted-foreground">{staff ? t.staffDescription : t.statusDescriptions[level]}</p>
            {data.since && level !== 'good' && <p className="text-xs text-muted-foreground">{fillTemplate(t.since, { date: formatDate(data.since, language) })}</p>}
            {data.probation_until && (
              <p className="text-xs font-medium">{fillTemplate(t.probationUntil, { date: formatDate(data.probation_until, language) })}</p>
            )}
          </section>
          {staff && (
            <section data-testid="staff-decision" className="space-y-2 rounded-lg border border-border p-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                <UserCheck className="h-3.5 w-3.5" />{t.reviewedByPerson}
              </span>
              <p className="text-sm font-medium">{fillTemplate(t.decisionRule, { rule: decisionReasonLabel(data.reason_code, t) })}</p>
              {data.reason_text && (
                <figure className="space-y-1">
                  <blockquote className="whitespace-pre-line border-l-2 border-border pl-3 text-sm">{data.reason_text}</blockquote>
                  <figcaption className="text-xs text-muted-foreground">{t.decisionAuthor}</figcaption>
                </figure>
              )}
            </section>
          )}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t.restrictionsTitle}</h3>
            {data.restrictions.length === 0 ? <p className="text-sm text-muted-foreground">{t.noRestrictions}</p> : (
              <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="account-restrictions">
                {data.restrictions.map((item) => <li key={item}>{restrictionLabel(item, t)}</li>)}
              </ul>
            )}
          </section>
          {level !== 'good' && staff && (
            <section className="space-y-2 rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold">{t.appealTitle}</h3>
              <p className="text-sm text-muted-foreground">{t.appealStaff}</p>
            </section>
          )}
          {level !== 'good' && !staff && (
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
        {outcomes && outcomes.items.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t.outcomesTitle}</h3>
            <ul className="space-y-2" data-testid="report-outcomes">
              {outcomes.items.map((item) => {
                const { title, description } = outcomeNotice(item, t);
                return (
                  <li key={item.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at, language)}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
