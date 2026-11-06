import { useEffect, useRef, useState } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { apiClient } from '@/shared/api/client';
import { registerPasskey } from '@/shared/api/passkeys';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const passkeyOfferFlag = (username: string) => `passkey_offer_dismissed:${username}`;

export const PasskeyOffer = ({ username, onDone }: { username: string; onDone: () => void }) => {
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(() => deviceLabel(navigator.userAgent));
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let active = true;
    const skip = () => { if (active) onDoneRef.current(); };
    if (!browserSupportsWebAuthn() || localStorage.getItem(passkeyOfferFlag(username)) === 'true') { skip(); return () => { active = false; }; }
    void apiClient.GET('/me/recovery-status').then(result => {
      if (!active) return;
      if (result.data?.passkeys_enabled) setReady(true);
      else skip();
    }).catch(skip);
    return () => { active = false; };
  }, [username]);

  const finish = () => {
    localStorage.setItem(passkeyOfferFlag(username), 'true');
    setPassword('');
    onDone();
  };

  const add = async () => {
    setBusy(true); setMessage('');
    try { await registerPasskey({ name, password }); finish(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Passkey registration was cancelled.'); }
    finally { setBusy(false); }
  };

  if (!ready) return <p role="status" className="text-sm text-muted-foreground">Loading…</p>;
  return <form className="space-y-3" onSubmit={event => { event.preventDefault(); void add(); }}>
    <h2 className="text-lg font-semibold">Add a passkey</h2>
    <p className="text-sm text-muted-foreground">Sign in with your fingerprint, face, or security key next time. Your password continues to work.</p>
    <Label htmlFor="offer-passkey-name">Passkey name</Label>
    <Input id="offer-passkey-name" maxLength={64} value={name} required onChange={event => setName(event.target.value)} />
    <Label htmlFor="offer-passkey-password">Password</Label>
    <Input id="offer-passkey-password" type="password" autoComplete="current-password" value={password} required
      onChange={event => setPassword(event.target.value)} />
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    <Button className="w-full" disabled={busy || !password}>{busy ? 'Waiting for passkey…' : 'Add a passkey'}</Button>
    <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={finish}>Not now</Button>
  </form>;
};
