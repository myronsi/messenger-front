import { useGetRecoveryOverviewQuery } from '@/features/profile';
import { Button } from '@/shared/ui/button';
import { recoveryMethodSummary } from '../model/recoveryMethods';

export const RecoveryOverviewCard = () => {
  const { data, isLoading, error, refetch } = useGetRecoveryOverviewQuery();
  if (isLoading) return <p role="status">Loading recovery methods…</p>;
  if (error || !data) return <div role="alert">Unable to load recovery status. <Button variant="ghost" onClick={() => { void refetch(); }}>Retry</Button></div>;
  const { count, total } = recoveryMethodSummary(data);
  const locked = data.recovery_key.locked_until && Date.parse(data.recovery_key.locked_until) > Date.now();
  const methods = [
    { name: 'Recovery key', status: data.recovery_key.exists ? 'Set up' : 'Not set up', target: 'recovery-key-settings' },
    { name: 'Other logged-in devices', status: `${data.other_devices} active`, target: 'security-sessions' },
    { name: 'Passkeys', status: data.passkeys_enabled ? `${data.passkeys} set up` : 'Not available on this server', target: 'passkey-settings' },
    { name: 'Recovery email', status: data.email.state === 'verified' ? 'Verified' : data.email.state === 'pending'
      ? 'Not verified' : data.email.enabled ? 'Not added' : 'Not available on this server', target: 'recovery-email-settings' },
  ];
  return <section aria-label="Recovery overview" className="rounded-xl border border-border p-4 space-y-3">
    <h3 className="font-medium">Recovery</h3>
    <p className={count ? 'text-sm text-emerald-700' : 'text-sm text-destructive'} role={count ? 'status' : 'alert'}>
      Recovery: {count} of {total} methods set up{count ? ' ✓' : '. Set up a method to protect access to your account.'}
    </p>
    <dl className="space-y-2">{methods.map(method => <div key={method.name} className="flex items-center justify-between gap-3 text-sm">
      <dt><button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => {
        document.getElementById(method.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}>{method.name}</button></dt><dd className="text-muted-foreground">{method.status}</dd>
    </div>)}</dl>
    {locked && <p role="status" className="text-sm text-amber-800">Recovery settings are locked for 24 hours after a password reset,
      until {new Date(data.recovery_key.locked_until!).toLocaleString()}.</p>}
  </section>;
};
