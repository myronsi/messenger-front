import { useGetSecurityActivityQuery } from '@/features/profile';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { Button } from '@/shared/ui/button';

const labels: Record<string, string> = {
  login: 'Signed in', passkey_login: 'Signed in with a passkey', logout: 'Signed out',
  password_changed: 'Password changed', password_reset: 'Password reset', password_reset_completed: 'Account recovery completed',
  '2fa_enabled': 'Two-factor authentication enabled', '2fa_disabled': 'Two-factor authentication disabled',
  recovery_key_changed: 'Recovery key changed', recovery_email_changed: 'Recovery email changed', recovery_email_removed: 'Recovery email removed',
  passkey_added: 'Passkey added', passkey_removed: 'Passkey removed', passkey_renamed: 'Passkey renamed',
  passkey_counter_warning: 'Passkey security check failed', refresh_reuse_detected: 'Session ended after a reused sign-in token',
  recovery_request_approved: 'Recovery request approved', recovery_request_denied: 'Recovery request denied',
};

export const SecurityActivity = () => {
  const { data, isLoading, error, refetch } = useGetSecurityActivityQuery(undefined, { refetchOnMountOrArgChange: true });
  return <section className="rounded-xl border border-border p-4 space-y-3" aria-label="Security activity">
    <h3 className="font-medium">Security activity</h3>
    {isLoading ? <p role="status">Loading security activity…</p> : error ? <div role="alert">Unable to load security activity.
      <Button variant="ghost" onClick={() => { void refetch(); }}>Retry</Button></div> : !data?.length ? <p>No security activity yet.</p> :
      <ol className="max-h-80 space-y-3 overflow-y-auto">{data.map(event => <li key={event.id} className="border-b border-border pb-2 last:border-0">
        <p className="text-sm font-medium">{labels[event.type] || 'Account security updated'}</p>
        <p className="text-xs text-muted-foreground">{deviceLabel(event.user_agent)} · <time dateTime={event.created_at}>
          {new Date(event.created_at).toLocaleString()}</time></p>
      </li>)}</ol>}
  </section>;
};
