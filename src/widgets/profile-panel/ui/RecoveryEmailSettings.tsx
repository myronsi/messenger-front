import { useEffect, useState } from 'react';
import { recoveryApi, useGetRecoveryEmailQuery } from '@/features/profile';
import { apiClient } from '@/shared/api/client';
import { useAppDispatch } from '@/shared/hooks/redux';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export const RecoveryEmailSettings = ({ locked, enabled }: { locked: boolean; enabled: boolean }) => {
  const { data, error } = useGetRecoveryEmailQuery(undefined, { skip: !enabled });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState(false);
  const dispatch = useAppDispatch();
  useEffect(() => { if (data?.address) setEmail(data.address); }, [data?.address]);
  const save = async (resend = false) => {
    setBusy(true); setMessage('');
    try {
      const result = await apiClient.PUT('/me/email', { body: { email: resend ? data!.address : email.trim(), password, code } });
      if (result.error) throw new Error();
      setMessage('Verification email sent. Check your inbox.'); setPassword(''); setCode('');
      dispatch(recoveryApi.util.invalidateTags(['Auth']));
    } catch { setMessage('Unable to send verification. Check your password and authentication code, or try again later.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setMessage('');
    try {
      const result = await apiClient.DELETE('/me/email', { body: { password, code } });
      if (result.error) throw new Error();
      setEmail(''); setPassword(''); setCode(''); setRemoving(false); setMessage('Recovery email removed.');
      dispatch(recoveryApi.util.invalidateTags(['Auth']));
    } catch { setMessage('Unable to remove this email. Check your password and authentication code.'); }
    finally { setBusy(false); }
  };
  return <section id="recovery-email-settings" aria-label="Recovery email" className="rounded-xl border border-border p-4 space-y-3">
    <h3 className="font-medium">Recovery email</h3>
    <p className="text-sm text-muted-foreground">Optional. Used only for recovery and security notices. Other users cannot see or search for this address.</p>
    {!enabled ? <p className="text-sm">Email recovery is not available on this server.</p> : <>
      {error && <p role="alert">Unable to load email settings.</p>}
      <p role="status" className="text-sm">{!data ? 'Loading email settings…' : data.state === 'verified' ? `Verified: ${data.address}`
        : data.state === 'pending' ? `Waiting for verification: ${data.address}` : 'No recovery email added.'}</p>
      <form className="space-y-2" onSubmit={event => { event.preventDefault(); void save(); }}>
        <Label htmlFor="recovery-email-address">Email address</Label>
        <Input id="recovery-email-address" type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required />
        <Label htmlFor="recovery-email-password">Current password</Label>
        <Input id="recovery-email-password" type="password" autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)} required />
        <Label htmlFor="recovery-email-code">Authenticator or backup code (if enabled)</Label>
        <Input id="recovery-email-code" maxLength={128} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} />
        <div className="flex flex-wrap gap-2"><Button disabled={busy || locked || !data}>Save recovery email</Button>
          {data?.state === 'pending' && <Button type="button" variant="outline" disabled={busy || locked || !password}
            onClick={() => { void save(true); }}>Resend verification</Button>}
          {data?.address && <Button type="button" variant="ghost" disabled={busy || locked} onClick={() => setRemoving(true)}>Remove email</Button>}
        </div>
      </form>
      {removing && <div role="alert" className="space-y-2"><p className="text-sm">Remove your recovery email? Keep another recovery method set up.</p>
        <Button variant="destructive" disabled={busy || locked || !password} onClick={() => { void remove(); }}>Confirm email removal</Button>
        <Button variant="ghost" onClick={() => setRemoving(false)}>Cancel</Button></div>}
    </>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
};
