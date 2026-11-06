import { getApiBaseUrl } from '@/shared/api/config';
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { endSession, setAccessToken } from '@/shared/auth/session';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';
import { ApiProblem } from '@/shared/api/problem';
import { isTwoFactorCancelled, useTwoFactorConfirm } from '@/shared/ui/useTwoFactorConfirm';
import { normalizeRecoveryKey } from './model/recoveryKey';

type Field = 'username' | 'recovery_key' | 'new_password' | 'confirm';

export const RecoveryKeyComponent = ({ onLoginSuccess, onBackToLogin, onTryAnotherWay, initialUsername = '' }: {
  onLoginSuccess: (username: string) => void; onBackToLogin: () => void; onTryAnotherWay?: () => void; initialUsername?: string;
}) => {
  const t = useLanguage().translations.recoveryFlow;
  const [form, setForm] = useState({ username: initialUsername, recovery_key: '', new_password: '', confirm: '' });
  const twoFactor = useTwoFactorConfirm();
  const [replacement, setReplacement] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (form.new_password !== form.confirm) { setError(t.passwordsDoNotMatch); return; }
    setBusy(true); setError('');
    try {
      const body = { username: form.username.trim().toLowerCase(), recovery_key: normalizeRecoveryKey(form.recovery_key), new_password: form.new_password };
      const data = await twoFactor.confirm(async code => {
        const response = await fetch(`${getApiBaseUrl()}/auth/recover/key`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, ...(code ? { code } : {}) }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = response.status === 429 ? t.keyTooManyAttempts : response.status === 422 ? t.keyWeakPassword : t.keyFailed;
          throw new ApiProblem(response.status, result, message);
        }
        return result;
      });
      if (!data.access_token || !data.recovery_key) throw new Error(t.keyIncomplete);
      endSession(); setToken(data.access_token); setReplacement(data.recovery_key);
      setForm(f => ({ ...f, recovery_key: '', new_password: '', confirm: '' }));
    } catch (e) { if (!isTwoFactorCancelled(e)) setError(e instanceof Error ? e.message : t.connectFailed); }
    finally { setBusy(false); }
  };
  const fields: { name: Field; label: string; type: string }[] = [
    { name: 'username', label: t.username, type: 'text' }, { name: 'recovery_key', label: t.recoveryKey, type: 'password' },
    { name: 'new_password', label: t.newPassword, type: 'password' }, { name: 'confirm', label: t.confirmPassword, type: 'password' },
  ];
  const username = form.username.trim().toLowerCase();
  return <Card className="mx-auto flex w-full max-w-md flex-col gap-[18px] rounded-2xl p-6 shadow-sm sm:p-7">
    {replacement ? <>
      <p className="text-sm text-slate-700">{t.keyResetDone}</p>
      <p className="text-sm text-slate-700">{t.methodsRemoved}</p>
      <RecoveryKeyReceipt recoveryKey={replacement} username={username}
        onContinue={() => { setAccessToken(token); setReplacement(''); setToken(''); onLoginSuccess(username); }} />
    </> : <>
      <button type="button" onClick={onBackToLogin} className="-ml-1 flex min-h-11 items-center gap-1.5 self-start text-[13px] text-slate-600 hover:underline">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t.backToSignIn}
      </button>
      <h1 className="text-[22px] font-bold leading-tight text-foreground">{t.keyTitle}</h1>
      <form className="flex flex-col gap-3.5" onSubmit={e => { e.preventDefault(); void submit(); }}>
        {fields.map(field => <div key={field.name} className="flex flex-col gap-1.5">
          <Label htmlFor={`recover-${field.name}`} className="text-[13px] font-medium text-slate-700">{field.label}</Label>
          <Input id={`recover-${field.name}`} type={field.type} value={form[field.name]} required className="h-11 border-slate-300"
            minLength={field.name === 'new_password' ? 8 : undefined} maxLength={field.name === 'recovery_key' ? 128 : 256}
            autoComplete={field.name === 'username' ? 'username' : field.name === 'new_password' || field.name === 'confirm' ? 'new-password' : 'off'}
            onChange={e => setForm(f => ({ ...f, [field.name]: e.target.value }))} />
        </div>)}
        <p className="text-sm text-slate-600">{t.keyHint}</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button className="h-11 w-full font-semibold" disabled={busy}>{busy ? t.keyRecovering : t.resetPassword}</Button>
      </form>
      {onTryAnotherWay && <Button type="button" variant="link" className="h-11" onClick={onTryAnotherWay}>{t.tryAnotherWay}</Button>}
    </>}
    {twoFactor.dialog}
  </Card>;
};
