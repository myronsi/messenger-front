import { useGetRecoveryOverviewQuery } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import type { RecoveryMethodId } from '../model/recoveryMethods';
import { recoveryHealth } from '../model/recoveryHealth';
import { localeOf } from '@/shared/lang/languages';

const ringColors = { full: 'stroke-success', good: 'stroke-success', weak: 'stroke-warning', none: 'stroke-destructive' };

export const RecoveryOverviewCard = ({ canAddPasskey, keySavingUnconfirmed, onAction }: {
  canAddPasskey: boolean;
  keySavingUnconfirmed: boolean;
  onAction: (method: RecoveryMethodId) => void;
}) => {
  const { data, isLoading, error, refetch } = useGetRecoveryOverviewQuery();
  const { translations, language } = useLanguage();
  const t = translations.securityPage;
  if (isLoading) return <p role="status" className="text-sm text-muted-foreground">{t.loadingMethods}</p>;
  if (error || !data) return <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">{t.loadMethodsFailed}
    <Button variant="outline" className="h-11" onClick={() => { void refetch(); }}>{t.retry}</Button></div>;
  const unconfirmed = data.recovery_key.exists && keySavingUnconfirmed;
  const readiness = unconfirmed ? { ...data, recovery_key: { ...data.recovery_key, exists: false } } : data;
  const health = recoveryHealth(readiness, canAddPasskey, t);
  const locked = data.recovery_key.locked_until && Date.parse(data.recovery_key.locked_until) > Date.now();
  return <section aria-labelledby="security-health-title" className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
    <ProgressRing progress={health.total ? health.count / health.total : 0} size={72} stroke={7} label={health.ringLabel} className={ringColors[health.level]}>
      <span className="text-lg font-semibold text-foreground">{health.count}/{health.total}</span>
    </ProgressRing>
    <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
      <h3 id="security-health-title" className="text-sm font-semibold leading-snug text-foreground">{health.headline}</h3>
      <p className="text-xs text-muted-foreground">{unconfirmed ? fillTemplate(t.summary, { count: String(health.count), total: String(health.total) }) : health.sentence}</p>
    </div>
    {health.next && health.actionLabel && <Button className="h-11 font-semibold" onClick={() => onAction(health.next!)}>{unconfirmed ? t.keyReplace : health.actionLabel}</Button>}
    {locked && <p role="status" className="w-full text-sm text-warning">
      {fillTemplate(t.lockedNotice, { date: new Date(data.recovery_key.locked_until!).toLocaleString(localeOf(language, undefined)) })}</p>}
  </section>;
};
