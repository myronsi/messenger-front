import { useState } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { recoveryApi, useGetPasskeysQuery } from '@/features/profile';
import { apiClient } from '@/shared/api/client';
import { registerPasskey } from '@/shared/api/passkeys';
import { useAppDispatch } from '@/shared/hooks/redux';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export const PasskeySettings = ({ locked, enabled }: { locked: boolean; enabled: boolean }) => {
  const { data: keys = [], isLoading, error: loadError } = useGetPasskeysQuery(undefined, { skip: !enabled });
  const dispatch = useAppDispatch();
  const [name, setName] = useState(() => deviceLabel(navigator.userAgent));
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [renamed, setRenamed] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const refresh = () => dispatch(recoveryApi.util.invalidateTags(['Auth']));
  const add = async () => {
    setBusy(true); setMessage('');
    try { await registerPasskey({ name, password, code }); setPassword(''); setCode(''); setMessage('Passkey added.'); refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Passkey registration was cancelled.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!removing) return;
    setBusy(true); setMessage('');
    try {
      const result = await apiClient.DELETE('/auth/passkeys/{passkeyId}', { params: { path: { passkeyId: removing } }, body: { password } });
      if (result.error) throw new Error();
      setRemoving(null); setPassword(''); setMessage('Passkey removed.'); refresh();
    } catch { setMessage('Unable to remove this passkey. Check your password or try again.'); }
    finally { setBusy(false); }
  };
  const rename = async () => {
    if (!editing) return;
    setBusy(true); setMessage('');
    try {
      const result = await apiClient.PATCH('/auth/passkeys/{passkeyId}', { params: { path: { passkeyId: editing } }, body: { name: renamed } });
      if (result.error) throw new Error();
      setEditing(null); setRenamed(''); refresh();
    } catch { setMessage('Unable to rename this passkey.'); }
    finally { setBusy(false); }
  };
  return <section id="passkey-settings" aria-label="Passkeys" className="rounded-xl border border-border p-4 space-y-3">
    <h3 className="font-medium">Passkeys</h3>
    <p className="text-sm text-muted-foreground">Sign in with your fingerprint, face, or security key. Your password continues to work.</p>
    {!enabled ? <p className="text-sm">Passkeys are not available on this server.</p> : <>
      {isLoading && <p role="status">Loading passkeys…</p>}{loadError && <p role="alert">Unable to load passkeys.</p>}
      {!isLoading && !loadError && !keys.length && <p className="text-sm">No passkeys yet.</p>}
      <ul className="space-y-3">{keys.map(key => <li key={key.id} className="space-y-1 border-b border-border pb-2">
        <p className="text-sm font-medium">{key.name}</p>
        <p className="text-xs text-muted-foreground">Created {new Date(key.created_at).toLocaleDateString()} ·
          Last used {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</p>
        <Button variant="ghost" disabled={busy || locked} onClick={() => { setEditing(key.id); setRenamed(key.name); }}>Rename</Button>
        <Button variant="ghost" disabled={busy || locked} onClick={() => { setRemoving(key.id); setPassword(''); }}>Remove</Button>
      </li>)}</ul>
      {editing && <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void rename(); }}>
        <Input aria-label="New passkey name" value={renamed} onChange={event => setRenamed(event.target.value)} maxLength={64} required />
        <Button disabled={busy || locked}>Save name</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
      </form>}
      {removing && <div role="alert" className="space-y-2">
        <p className="text-sm">Remove this passkey? Removing your last passkey requires your password. Make sure you can still sign in.</p>
        <Label htmlFor="remove-passkey-password">Current password</Label>
        <Input id="remove-passkey-password" type="password" autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)} />
        <Button variant="destructive" disabled={busy || locked || (keys.length === 1 && !password)} onClick={() => { void remove(); }}>Confirm removal</Button>
        <Button variant="ghost" onClick={() => { setRemoving(null); setPassword(''); }}>Cancel</Button>
      </div>}
      {browserSupportsWebAuthn() ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); void add(); }}>
        <Label htmlFor="passkey-name">Passkey name</Label><Input id="passkey-name" maxLength={64} value={name} required onChange={e => setName(e.target.value)} />
        <Label htmlFor="add-passkey-password">Current password</Label><Input id="add-passkey-password" type="password" autoComplete="current-password"
          value={password} onChange={event => setPassword(event.target.value)} required />
        <Label htmlFor="add-passkey-code">Authenticator or backup code (if enabled)</Label>
        <Input id="add-passkey-code" autoComplete="one-time-code" maxLength={128} value={code} onChange={event => setCode(event.target.value)} />
        <Button disabled={busy || locked}>{busy ? 'Waiting for passkey…' : 'Add passkey'}</Button>
      </form> : <p className="text-sm">This browser does not support adding passkeys.</p>}
    </>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
};
