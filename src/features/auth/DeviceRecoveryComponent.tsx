import { useEffect, useState } from 'react';
import { publicApiClient as apiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';
import { setAccessToken } from '@/shared/auth/session';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

type Request = components['schemas']['DeviceRecoveryResult'];
type Result = components['schemas']['RegisterResponse'];

export const DeviceRecoveryComponent = ({ onLoginSuccess, onBack }: { onLoginSuccess: (username: string) => void; onBack: () => void }) => {
  const [username, setUsername] = useState('');
  const [request, setRequest] = useState<Request | null>(null);
  const [status, setStatus] = useState('pending');
  const [seconds, setSeconds] = useState(600);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!request || status !== 'pending') return;
    let active = true;
    let controller: AbortController | undefined;
    const poll = async () => {
      if (document.visibilityState !== 'visible' || controller) return;
      controller = new AbortController();
      try {
        const { data, error } = await apiClient.GET('/auth/recovery-requests/{requestId}', {
          params: { path: { requestId: request.request_id } }, signal: controller.signal,
        });
        if (active && data) setStatus(data.status);
        if (active && error) setError('Unable to check approval. Trying again…');
        else if (active) setError('');
      } catch { if (active) setError('Unable to connect. Trying again…'); }
      finally { controller = undefined; }
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') void poll();
      else controller?.abort();
    };
    const timer = window.setInterval(() => { void poll(); }, 2500);
    document.addEventListener('visibilitychange', visibility);
    void poll();
    return () => { active = false; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [request, status]);

  useEffect(() => {
    if (!request || !['pending', 'approved'].includes(status)) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((Date.parse(request.expires_at) - Date.now()) / 1000));
      setSeconds(left); if (!left) setStatus('expired');
    };
    tick(); const timer = window.setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [request, status]);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const { data, error } = await apiClient.POST('/auth/recovery-requests', { body: { username: username.trim().toLowerCase() } });
      if (error || !data) throw new Error();
      setUsername(username.trim().toLowerCase()); setRequest(data); setStatus('pending');
    } catch { setError('Unable to start recovery. Please try again later.'); }
    finally { setBusy(false); }
  };
  const complete = async () => {
    if (!request || password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error } = await apiClient.POST('/auth/recovery-requests/{requestId}/complete', {
        params: { path: { requestId: request.request_id } }, body: { new_password: password },
      });
      if (error || !data?.access_token || !data.recovery_key) throw new Error();
      setPassword(''); setConfirm(''); setResult(data); setRequest(null);
    } catch { setError('Recovery could not be completed. Try again or use your recovery key.'); }
    finally { setBusy(false); }
  };

  return <Card><CardHeader><CardTitle>Approve from another device</CardTitle></CardHeader><CardContent className="space-y-4">
    {result?.recovery_key ? <RecoveryKeyReceipt recoveryKey={result.recovery_key} username={username} onContinue={() => {
      setAccessToken(result.access_token); setResult(null); onLoginSuccess(username);
    }} /> : <>
      {!request ? <form className="space-y-3" onSubmit={event => { event.preventDefault(); void start(); }}>
        <Label htmlFor="device-recovery-username">Username</Label>
        <Input id="device-recovery-username" autoComplete="username" value={username} required minLength={3}
          onChange={event => setUsername(event.target.value)} />
        <Button disabled={busy}>Request approval</Button>
      </form> : status === 'approved' ? <form className="space-y-3" onSubmit={event => { event.preventDefault(); void complete(); }}>
        <p role="status">Approved. Choose a new password.</p>
        <Label htmlFor="device-new-password">New password</Label>
        <Input id="device-new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
          value={password} onChange={event => setPassword(event.target.value)} />
        <Label htmlFor="device-confirm-password">Confirm new password</Label>
        <Input id="device-confirm-password" type="password" autoComplete="new-password" required
          value={confirm} onChange={event => setConfirm(event.target.value)} />
        <Button disabled={busy}>Reset password</Button>
      </form> : status === 'pending' ? <>
        <p>Open Messenger on a device where you are signed in and choose this number:</p>
        <p className="text-center text-5xl font-bold" aria-label={`Match number ${request.match_number}`}>{request.match_number}</p>
        <p role="status">Expires in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>
        <Button variant="outline" onClick={() => { setRequest(null); setError(''); }}>Cancel</Button>
      </> : <><p role="status">This request was {status}. Try again or use your recovery key.</p>
        <Button onClick={() => { setRequest(null); setError(''); }}>Try again</Button></>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button variant="ghost" onClick={onBack}>Use another recovery method</Button>
    </>}
  </CardContent></Card>;
};
