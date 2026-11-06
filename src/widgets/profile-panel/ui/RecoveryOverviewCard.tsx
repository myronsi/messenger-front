import { Check, Plus } from 'lucide-react';
import { useGetRecoveryOverviewQuery } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import { recoveryMethods, type RecoveryMethodId } from '../model/recoveryMethods';
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
  const formatDate = (value: string) => new Date(value).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const names: Record<RecoveryMethodId, string> = { key: t.methodKey, devices: t.methodDevices, passkeys: t.methodPasskeys, email: t.methodEmail };
  const details: Record<RecoveryMethodId, string> = {
    key: !data.recovery_key.exists ? t.notAdded : data.recovery_key.created_at
      ? fillTemplate(t.keyCreatedTile, { date: formatDate(data.recovery_key.created_at) }) : t.keySetUp,
    devices: data.other_devices > 0 ? fillTemplate(t.devicesCount, { count: String(data.other_devices) }) : t.devicesNone,
    passkeys: data.passkeys > 0 ? fillTemplate(t.passkeysCount, { count: String(data.passkeys) }) : t.notAdded,
    email: data.email.state === 'verified' ? t.emailVerified : data.email.state === 'pending' ? t.emailPending : t.notAdded,
  };
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
    <ul className="grid w-full grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2.5">
      {recoveryMethods(data).map(method => <li key={method.id}>
        <button type="button" onClick={() => onAction(method.id)} className={cn(
          'flex min-h-11 w-full items-center gap-2.5 rounded-lg p-3 text-left hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          method.active ? 'border border-border' : 'border border-dashed border-input',
        )}>
          <span className={cn('flex h-6 w-6 flex-none items-center justify-center rounded-full',
            method.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
            {method.active ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold text-foreground">{names[method.id]}<span className="sr-only">: {method.active ? t.methodReady : t.methodMissing}</span></span>
            <span className="text-xs text-muted-foreground">{details[method.id]}</span>
          </span>
        </button>
      </li>)}
    </ul>
    {locked && <p role="status" className="w-full text-sm text-amber-800">
      {fillTemplate(t.lockedNotice, { date: new Date(data.recovery_key.locked_until!).toLocaleString(language === 'ru' ? 'ru-RU' : undefined) })}</p>}
  </section>;
};
