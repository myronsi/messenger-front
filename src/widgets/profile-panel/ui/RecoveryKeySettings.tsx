import { recoveryApi, useGetCurrentUserQuery, useGetRecoveryKeyStatusQuery } from '@/features/profile';
import { apiClient } from '@/shared/api/client';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';

export const RecoveryKeySettings = ({ onDismissSafetyChange }: { onDismissSafetyChange?: (blocked: boolean) => void }) => {
  const { data: user } = useGetCurrentUserQuery();
  const { data: status, error: loadError } = useGetRecoveryKeyStatusQuery();
  const dispatch = useAppDispatch();
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { onDismissSafetyChange?.(busy || Boolean(key)); }, [busy, key, onDismissSafetyChange]);
  const locked = Boolean(status?.locked_until && new Date(status.locked_until).getTime() > Date.now());
  const create = async () => {
    onDismissSafetyChange?.(true);
    setBusy(true); setError('');
    try {
      const result = await apiClient.POST('/me/recovery-key', { body: { password, code: code.trim() } });
      if (result.error || !result.data?.recovery_key) throw new Error(result.response.status === 409
        ? 'Security changes are temporarily locked for 24 hours after account recovery.' : 'Check your password and authentication code.');
      setKey(result.data.recovery_key); setPassword(''); setCode('');
      dispatch(recoveryApi.util.invalidateTags(['Auth']));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create a recovery key.'); }
    finally { setBusy(false); }
  };
  return <section id="recovery-key-settings" className="rounded-xl border border-border p-4 space-y-3"><h3 className="font-medium">Recovery key</h3>
    {key ? <RecoveryKeyReceipt recoveryKey={key} username={user?.username || ''} onContinue={() => setKey('')} /> : <>
      <p className="text-sm text-muted-foreground">{status ? status.exists ? 'A recovery key is set up. Creating a replacement immediately invalidates your old key.' : 'Create a recovery key so you can reset a forgotten password. Save it somewhere safe.' : 'Loading recovery settings…'}</p>
      {status?.created_at && <p className="text-sm">Created on {new Date(status.created_at).toLocaleDateString()}</p>}
      {locked ? <p className="text-sm">Security changes are locked until {new Date(status!.locked_until!).toLocaleString()} after account recovery.</p> : status && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void create(); }}>
        <Label htmlFor="recovery-password">Current password</Label><Input id="recovery-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        <Label htmlFor="recovery-code">Authenticator or backup code (if enabled)</Label><Input id="recovery-code" autoComplete="off" maxLength={128} value={code} onChange={e => setCode(e.target.value)} />
        <Button disabled={busy}>{busy ? 'Creating…' : status.exists ? 'Replace recovery key' : 'Create recovery key'}</Button>
      </form>}
    </>}{loadError && <p role="alert">Unable to load recovery key settings.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
};
