import { useLayoutEffect, useState } from 'react';
import { publicApiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';
import { setAccessToken } from '@/shared/auth/session';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

export const EmailRecoveryComponent = ({ mode, onBack, onLoginSuccess }: {
  mode: 'request' | 'verify' | 'reset'; onBack: () => void; onLoginSuccess: (username: string) => void;
}) => {
  const [token, setToken] = useState(() => mode === 'request' ? '' : new URLSearchParams(window.location.search).get('token') || '');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<components['schemas']['RegisterResponse'] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  useLayoutEffect(() => {
    if (mode === 'request') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [mode]);

  const submit = async () => {
    if (mode === 'reset' && password !== confirm) { setMessage('Passwords do not match.'); return; }
    setBusy(true); setMessage('');
    try {
      if (mode === 'request') {
        const response = await publicApiClient.POST('/auth/password-reset/request', { body: { username_or_email: identifier.trim() } });
        if (response.error) throw new Error();
        setMessage('If an account with a verified email exists, we have sent a recovery link.');
      } else if (mode === 'verify') {
        const response = await publicApiClient.POST('/auth/email/verify', { body: { token } });
        if (response.error) throw new Error();
        setVerified(true); setToken(''); setMessage('Your recovery email is verified.');
      } else {
        const response = await publicApiClient.POST('/auth/password-reset/confirm', { body: { token, new_password: password, code } });
        if (response.error || !response.data?.access_token || !response.data.recovery_key || !response.data.username) throw new Error();
        setToken(''); setPassword(''); setConfirm(''); setCode(''); setResult(response.data);
      }
    } catch { setMessage(mode === 'request' ? 'Unable to request recovery. Please try again later.'
      : 'This link or authentication code is invalid or expired. Request a new link or use another recovery method.'); }
    finally { setBusy(false); }
  };

  const title = mode === 'request' ? 'Recover by email' : mode === 'verify' ? 'Verify recovery email' : 'Reset your password';
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-4">
    {result?.recovery_key ? <RecoveryKeyReceipt recoveryKey={result.recovery_key} username={result.username!} onContinue={() => {
      setAccessToken(result.access_token); const username = result.username!; setResult(null); onLoginSuccess(username);
    }} /> : <>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
        {mode === 'request' ? <><Label htmlFor="email-recovery-identifier">Username or email</Label>
          <Input id="email-recovery-identifier" autoComplete="username" required maxLength={254} value={identifier}
            onChange={event => setIdentifier(event.target.value)} /></> : mode === 'reset' ? <>
          <Label htmlFor="email-new-password">New password</Label>
          <Input id="email-new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required
            value={password} onChange={event => setPassword(event.target.value)} />
          <Label htmlFor="email-confirm-password">Confirm new password</Label>
          <Input id="email-confirm-password" type="password" autoComplete="new-password" required value={confirm}
            onChange={event => setConfirm(event.target.value)} />
          <Label htmlFor="email-reset-code">Authenticator or backup code (if enabled)</Label>
          <Input id="email-reset-code" autoComplete="one-time-code" maxLength={128} value={code} onChange={event => setCode(event.target.value)} />
        </> : <p className="text-sm">Confirm that this email address belongs to you. It will be used only for account recovery and security notices.</p>}
        {!verified && <Button disabled={busy || (mode !== 'request' && !token)}>
          {busy ? 'Please wait…' : mode === 'request' ? 'Send recovery email' : mode === 'verify' ? 'Verify email' : 'Reset password'}
        </Button>}
      </form>
      {mode !== 'request' && !token && !verified && <p role="alert">This link is missing its recovery token. Request a new link.</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <Button variant="outline" onClick={onBack}>Back to sign in</Button>
    </>}
  </CardContent></Card>;
};
