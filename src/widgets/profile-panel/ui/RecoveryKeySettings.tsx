import { useEffect, useState } from 'react';
import { authFetch } from '@/shared/auth/session';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';

interface KeyStatus { exists: boolean; created_at: string | null; locked_until: string | null }
export const RecoveryKeySettings = () => {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try { const r = await authFetch(`${import.meta.env.VITE_BASE_URL}/me/recovery-key`); if (!r.ok) throw new Error(); setStatus(await r.json()); }
    catch { setError('Unable to load recovery key settings.'); }
  };
  useEffect(() => { void load(); }, []);
  const locked = Boolean(status?.locked_until && new Date(status.locked_until).getTime() > Date.now());
  const create = async () => {
    setBusy(true); setError('');
    try {
      const r = await authFetch(`${import.meta.env.VITE_BASE_URL}/me/recovery-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, code: code.trim() }) });
      if (!r.ok) throw new Error(r.status === 409 ? 'Security changes are temporarily locked for 24 hours after account recovery.' : r.status === 429 ? 'Too many attempts. Please try again later.' : 'Check your password and authentication code.');
      const data = await r.json(); if (!data.recovery_key) throw new Error('The server did not return a recovery key.');
      setKey(data.recovery_key); setPassword(''); setCode(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create a recovery key.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-border p-4 space-y-3"><h3 className="font-medium">Account recovery</h3>
    {key ? <RecoveryKeyReceipt recoveryKey={key} onContinue={() => setKey('')} /> : <>
      <p className="text-sm text-muted-foreground">{status ? status.exists ? 'A recovery key is set up. Creating a replacement immediately invalidates your old key.' : 'Create a recovery key so you can reset a forgotten password. Save it somewhere safe.' : 'Loading recovery settings…'}</p>
      {locked ? <p className="text-sm">Security changes are locked until {new Date(status!.locked_until!).toLocaleString()} after account recovery.</p> : status && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void create(); }}>
        <Label htmlFor="recovery-password">Current password</Label><Input id="recovery-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        <Label htmlFor="recovery-code">Authenticator or backup code (if enabled)</Label><Input id="recovery-code" autoComplete="off" maxLength={128} value={code} onChange={e => setCode(e.target.value)} />
        <Button disabled={busy}>{busy ? 'Creating…' : status.exists ? 'Replace recovery key' : 'Create recovery key'}</Button>
      </form>}
    </>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
};
