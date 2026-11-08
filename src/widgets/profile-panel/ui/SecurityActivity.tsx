import { useGetSecurityActivityQuery } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { locationLabel } from '@/shared/lib/locationLabel';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { isWarningEvent } from '../model/securityEvents';
import { localeOf } from '@/shared/lang/languages';

export const SecurityActivity = ({ onSignOutOthers, signingOutOthers, signOutLabel }: {
  onSignOutOthers?: () => void; signingOutOthers?: boolean; signOutLabel: string;
}) => {
  const { translations, language } = useLanguage();
  const t = translations.securityPage;
  const labels = t.events as Record<string, string>;
  const { data, isLoading, error, refetch } = useGetSecurityActivityQuery(undefined, { refetchOnMountOrArgChange: true });
  const action = onSignOutOthers && <Button variant="outline" className="h-11 border-destructive/30 px-3.5 text-[13px] font-semibold text-destructive hover:bg-destructive-soft hover:text-destructive"
    disabled={signingOutOthers} onClick={onSignOutOthers}>{signOutLabel}</Button>;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 flex-1 basis-48 text-sm text-muted-foreground">{t.activityDescription}</p>
      {action}
    </div>
    <div className="overflow-hidden rounded-xl border border-border bg-card px-4 py-1">
      {isLoading ? <p role="status" className="py-3 text-sm text-muted-foreground">{t.activityLoading}</p> : error ? <div role="alert"
        className="flex flex-wrap items-center gap-2 py-3 text-sm">{t.activityLoadFailed}
        <Button variant="outline" className="h-11" onClick={() => { void refetch(); }}>{t.retry}</Button></div>
        : !data?.length ? <p className="py-3 text-sm text-muted-foreground">{t.activityEmpty}</p> :
          <ol aria-label={t.activityTitle} className="flex flex-col">{data.map(event => {
            const warning = isWarningEvent(event.type);
            return <li key={event.id} className="flex gap-3 border-b border-border py-3 last:border-0">
              <span aria-hidden="true" className={cn('mt-1.5 h-2 w-2 flex-none rounded-full', warning ? 'bg-warning' : 'bg-primary')} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm text-foreground', warning && 'font-medium text-warning')}>
                  {labels[event.type] || t.eventFallback}{warning && <span className="sr-only"> ({t.needsAttention})</span>}
                </p>
                <p className="text-xs text-muted-foreground">{deviceLabel(event.user_agent)} · {locationLabel(event.location, language) ?? t.locationUnknown} · <time dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString(localeOf(language), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </time></p>
              </div>
            </li>;
          })}</ol>}
    </div>
  </>;
};
