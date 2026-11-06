import { useEffect, useState } from 'react';
import { publicApiClient as apiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';
import { setAccessToken } from '@/shared/auth/session';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { localDeadline, secondsUntil } from '@/shared/lib/countdown';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { DeviceRecoveryWaiting } from './components/DeviceRecoveryWaiting';
import { DEVICE_RECOVERY_TTL_MS } from './model/requestLifetimes';

type Request = components['schemas']['DeviceRecoveryResult'];
type Result = components['schemas']['RegisterResponse'];

export const DeviceRecoveryComponent = ({ onLoginSuccess, onBack, initialUsername = '' }: {
  onLoginSuccess: (username: string) => void; onBack: () => void; initialUsername?: string;
}) => {
  const t = useLanguage().translations.recoveryFlow;
  const [username, setUsername] = useState(initialUsername);
  const [request, setRequest] = useState<Request | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [status, setStatus] = useState('pending');
  const [seconds, setSeconds] = useState(600);
  const [totalSeconds, setTotalSeconds] = useState(600);
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
        if (active && error) setError(t.checkFailed);
        else if (active) setError('');
      } catch { if (active) setError(t.connectRetry); }
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
  }, [request, status, t]);

  useEffect(() => {
    if (!request || !['pending', 'approved'].includes(status)) return;
    const tick = () => {
      const left = secondsUntil(deadline);
      setSeconds(left); if (!left) setStatus('expired');
    };
    tick(); const timer = window.setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [request, deadline, status]);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const { data, error } = await apiClient.POST('/auth/recovery-requests', { body: { username: username.trim().toLowerCase() } });
      if (error || !data) throw new Error();
      const nextDeadline = localDeadline(data.expires_at, DEVICE_RECOVERY_TTL_MS);
      setUsername(username.trim().toLowerCase()); setRequest(data); setDeadline(nextDeadline); setStatus('pending');
      setTotalSeconds(Math.max(1, secondsUntil(nextDeadline)));
    } catch { setError(t.startFailed); }
    finally { setBusy(false); }
  };
  const complete = async () => {
    if (!request || password !== confirm) { setError(t.passwordsDoNotMatch); return; }
    setBusy(true); setError('');
    try {
      const { data, error } = await apiClient.POST('/auth/recovery-requests/{requestId}/complete', {
        params: { path: { requestId: request.request_id } }, body: { new_password: password },
      });
      if (error || !data?.access_token || !data.recovery_key) throw new Error();
      setPassword(''); setConfirm(''); setResult(data); setRequest(null);
    } catch { setError(t.completeFailed); }
    finally { setBusy(false); }
  };

  const reset = () => { setRequest(null); setError(''); };
  const statusLabel = status === 'denied' ? t.statusDenied : status === 'used' ? t.statusUsed : t.statusExpired;
  const label = 'text-[13px] font-medium text-slate-700';
  const waiting = Boolean(request) && status === 'pending';
  return <Card className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl p-6 shadow-sm sm:p-7">
    {result?.recovery_key ? <RecoveryKeyReceipt recoveryKey={result.recovery_key} username={username} onContinue={() => {
      setAccessToken(result.access_token); setResult(null); onLoginSuccess(username);
    }} /> : <>
      {!request ? <form className="flex flex-col gap-3.5" onSubmit={event => { event.preventDefault(); void start(); }}>
        <h1 className="text-[22px] font-bold leading-tight text-foreground">{t.deviceTitle}</h1>
        <p className="text-sm text-slate-600">{t.deviceIntro}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="device-recovery-username" className={label}>{t.username}</Label>
          <Input id="device-recovery-username" autoComplete="username" value={username} required minLength={3} className="h-11 border-slate-300"
            onChange={event => setUsername(event.target.value)} />
        </div>
        <Button className="h-11 w-full font-semibold" disabled={busy}>{t.requestApproval}</Button>
      </form> : status === 'approved' ? <form className="flex flex-col gap-3.5" onSubmit={event => { event.preventDefault(); void complete(); }}>
        <p role="status" className="text-[15px] font-semibold text-green-700">{t.approved}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="device-new-password" className={label}>{t.newPassword}</Label>
          <Input id="device-new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
            className="h-11 border-slate-300" value={password} onChange={event => setPassword(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="device-confirm-password" className={label}>{t.confirmPassword}</Label>
          <Input id="device-confirm-password" type="password" autoComplete="new-password" required className="h-11 border-slate-300"
            value={confirm} onChange={event => setConfirm(event.target.value)} />
        </div>
        <Button className="h-11 w-full font-semibold" disabled={busy}>{t.resetPassword}</Button>
      </form> : waiting ? <DeviceRecoveryWaiting username={username} matchNumber={request.match_number} seconds={seconds}
        totalSeconds={totalSeconds} onCancel={reset} onTryAnotherWay={onBack} /> : <>
        <p role="status" className="text-sm text-slate-700">{fillTemplate(t.requestEnded, { status: statusLabel })}</p>
        <Button className="h-11" onClick={reset}>{t.tryAgain}</Button>
      </>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!waiting && <Button variant="link" className="h-11" onClick={onBack}>{t.tryAnotherWay}</Button>}
    </>}
  </Card>;
};
