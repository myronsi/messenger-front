import { useEffect, useLayoutEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { publicApiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';
import { setAccessToken } from '@/shared/auth/session';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { ApiProblem } from '@/shared/api/problem';
import { isTwoFactorCancelled, useTwoFactorConfirm } from '@/shared/ui/useTwoFactorConfirm';
import { EmailSentNotice } from './components/EmailSentNotice';

const RESEND_SECONDS = 60;

export const EmailRecoveryComponent = ({ mode, onBack, onLoginSuccess, onTryAnotherWay, initialIdentifier = '' }: {
  mode: 'request' | 'verify' | 'reset'; onBack: () => void; onLoginSuccess: (username: string) => void;
  onTryAnotherWay?: () => void; initialIdentifier?: string;
}) => {
  const t = useLanguage().translations.recoveryFlow;
  const [token, setToken] = useState(() => mode === 'request' ? '' : new URLSearchParams(window.location.search).get('token') || '');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const twoFactor = useTwoFactorConfirm();
  const [result, setResult] = useState<components['schemas']['RegisterResponse'] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  useLayoutEffect(() => {
    if (mode === 'request') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [mode]);
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const submit = async () => {
    if (mode === 'reset' && password !== confirm) { setMessage(t.passwordsDoNotMatch); return; }
    setBusy(true); setMessage('');
    try {
      if (mode === 'request') {
        const response = await publicApiClient.POST('/auth/password-reset/request', { body: { username_or_email: identifier.trim() } });
        if (response.error) throw new Error();
        setSent(true); setResendIn(RESEND_SECONDS);
      } else if (mode === 'verify') {
        const response = await publicApiClient.POST('/auth/email/verify', { body: { token } });
        if (response.error) throw new Error();
        setVerified(true); setToken(''); setMessage(t.verified);
      } else {
        const data = await twoFactor.confirm(async code => {
          const response = await publicApiClient.POST('/auth/password-reset/confirm', { body: { token, new_password: password, ...(code ? { code } : {}) } });
          if (response.error) throw new ApiProblem(response.response.status, response.error);
          return response.data;
        });
        if (!data?.access_token || !data.recovery_key || !data.username) throw new Error();
        setToken(''); setPassword(''); setConfirm(''); setResult(data);
      }
    } catch (caught) { if (!isTwoFactorCancelled(caught)) setMessage(mode === 'request' ? t.emailRequestFailed : t.linkInvalid); }
    finally { setBusy(false); }
  };

  const title = mode === 'request' ? t.emailTitle : mode === 'verify' ? t.verifyTitle : t.resetTitle;
  const label = 'text-[13px] font-medium text-slate-700';
  const field = 'h-11 border-slate-300';
  return <Card className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl p-6 shadow-sm sm:p-8">
    {result?.recovery_key ? <RecoveryKeyReceipt recoveryKey={result.recovery_key} username={result.username!} onContinue={() => {
      setAccessToken(result.access_token); const username = result.username!; setResult(null); onLoginSuccess(username);
    }} /> : sent ? <EmailSentNotice identifier={identifier.trim()} resendIn={resendIn} busy={busy} message={message}
      onResend={() => { void submit(); }} onTryAnotherWay={onTryAnotherWay ?? onBack} /> : <>
      <button type="button" onClick={onBack} className="-ml-1 flex min-h-11 items-center gap-1.5 self-start text-[13px] text-slate-600 hover:underline">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t.backToSignIn}
      </button>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold leading-tight text-foreground">{title}</h1>
        {mode === 'request' && <p className="text-sm text-slate-600">{t.emailIntro}</p>}
      </div>
      <form className="flex flex-col gap-3.5" onSubmit={event => { event.preventDefault(); void submit(); }}>
        {mode === 'request' ? <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-recovery-identifier" className={label}>{t.emailIdentifier}</Label>
          <Input id="email-recovery-identifier" autoComplete="username" required maxLength={254} value={identifier} className={field}
            onChange={event => setIdentifier(event.target.value)} />
        </div> : mode === 'reset' ? <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-new-password" className={label}>{t.newPassword}</Label>
            <Input id="email-new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className={field}
              value={password} onChange={event => setPassword(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-confirm-password" className={label}>{t.confirmPassword}</Label>
            <Input id="email-confirm-password" type="password" autoComplete="new-password" required value={confirm} className={field}
              onChange={event => setConfirm(event.target.value)} />
          </div>
        </> : <p className="text-sm text-slate-700">{t.verifyBody}</p>}
        {!verified && <Button className="h-11 w-full font-semibold" disabled={busy || (mode !== 'request' && !token)}>
          {busy ? t.pleaseWait : mode === 'request' ? t.sendEmail : mode === 'verify' ? t.verifyEmail : t.resetPassword}
        </Button>}
      </form>
      {mode !== 'request' && !token && !verified && <p role="alert" className="text-sm text-red-700">{t.linkMissingToken}</p>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
      {onTryAnotherWay && <Button variant="link" className="h-11" onClick={onTryAnotherWay}>{t.tryAnotherWay}</Button>}
    </>}
    {twoFactor.dialog}
  </Card>;
};
