import { useGetRecoveryOverviewQuery } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import type { RecoveryMethodId } from '../model/recoveryMethods';
import { recoveryHealth } from '../model/recoveryHealth';

const ringColors = { full: 'stroke-green-600', good: 'stroke-green-600', weak: 'stroke-amber-500', none: 'stroke-red-600' };

export const RecoveryOverviewCard = ({ canAddPasskey, onAction }: { canAddPasskey: boolean; onAction: (method: RecoveryMethodId) => void }) => {
  const { data, isLoading, error, refetch } = useGetRecoveryOverviewQuery();
  const { translations, language } = useLanguage();
  const t = translations.securityPage;
  if (isLoading) return <p role="status" className="text-sm text-muted-foreground">{t.loadingMethods}</p>;
  if (error || !data) return <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">{t.loadMethodsFailed}
    <Button variant="outline" className="h-11" onClick={() => { void refetch(); }}>{t.retry}</Button></div>;
  const health = recoveryHealth(data, canAddPasskey, t);
  const locked = data.recovery_key.locked_until && Date.parse(data.recovery_key.locked_until) > Date.now();
  return <section aria-labelledby="security-health-title" className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
    <ProgressRing progress={health.total ? health.count / health.total : 0} size={72} stroke={7} label={health.ringLabel} className={ringColors[health.level]}>
      <span className="text-lg font-semibold text-foreground">{health.count}/{health.total}</span>
    </ProgressRing>
    <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
      <h3 id="security-health-title" className="text-sm font-semibold leading-snug text-foreground">{health.headline}</h3>
      <p className="text-xs text-muted-foreground">{health.sentence}</p>
    </div>
    {health.next && health.actionLabel && <Button className="h-11 font-semibold" onClick={() => onAction(health.next!)}>{health.actionLabel}</Button>}
    {locked && <p role="status" className="w-full text-sm text-amber-800">
      {fillTemplate(t.lockedNotice, { date: new Date(data.recovery_key.locked_until!).toLocaleString(language === 'ru' ? 'ru-RU' : undefined) })}</p>}
  </section>;
};
