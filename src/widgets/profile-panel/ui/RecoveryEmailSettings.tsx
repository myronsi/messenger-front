import { useEffect, useState } from 'react';
import { recoveryApi, useGetRecoveryEmailQuery } from '@/features/profile';
import { apiClient } from '@/shared/api/client';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { ApiProblem } from '@/shared/api/problem';
import { isTwoFactorCancelled } from '@/shared/ui/useTwoFactorConfirm';
import { useAccountTwoFactor } from '../model/useAccountTwoFactor';
import { SecurityRow, securityInput, securityLabel } from './SecuritySection';

export const RecoveryEmailSettings = ({ locked, enabled }: { locked: boolean; enabled: boolean }) => {
  const t = useLanguage().translations.securityPage;
  const { data, error } = useGetRecoveryEmailQuery(undefined, { skip: !enabled });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const twoFactor = useAccountTwoFactor();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState(false);
  const dispatch = useAppDispatch();
  useEffect(() => { if (data?.address) setEmail(data.address); }, [data?.address]);
  const save = async (resend = false) => {
    setBusy(true); setMessage('');
    try {
      await twoFactor.confirm(async code => {
        const result = await apiClient.PUT('/me/email', { body: { email: resend ? data!.address : email.trim(), password, ...(code ? { code } : {}) } });
        if (result.error) throw new ApiProblem(result.response.status, result.error);
      });
      setMessage(t.emailSent); setPassword('');
      dispatch(recoveryApi.util.invalidateTags(['Auth']));
    } catch (caught) { if (!isTwoFactorCancelled(caught)) setMessage(t.emailSendFailed); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setMessage('');
    try {
      await twoFactor.confirm(async code => {
        const result = await apiClient.DELETE('/me/email', { body: { password, ...(code ? { code } : {}) } });
        if (result.error) throw new ApiProblem(result.response.status, result.error);
      });
      setEmail(''); setPassword(''); setRemoving(false); setMessage(t.emailRemoved);
      dispatch(recoveryApi.util.invalidateTags(['Auth']));
    } catch (caught) { if (!isTwoFactorCancelled(caught)) setMessage(t.emailRemoveFailed); }
    finally { setBusy(false); }
  };
  const state = !data ? t.emailLoading : data.state === 'verified' ? fillTemplate(t.emailVerifiedStatus, { address: data.address })
    : data.state === 'pending' ? fillTemplate(t.emailPendingStatus, { address: data.address }) : t.emailNone;
  return <SecurityRow id="recovery-email-settings" region title={t.emailTitle}
    description={<><span className="block">{t.emailDescription}</span>{enabled && <span role="status" className="mt-1 block text-muted-foreground">{state}</span>}</>}>
    {!enabled ? <p className="text-sm text-muted-foreground">{t.emailUnavailable}</p> : <>
      {error && <p role="alert" className="text-sm text-destructive">{t.emailLoadFailed}</p>}
      <form id="recovery-email-form" className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recovery-email-address" className={securityLabel}>{t.emailAddress}</Label>
          <Input id="recovery-email-address" type="email" autoComplete="email" maxLength={254} className={securityInput} value={email}
            onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recovery-email-password" className={securityLabel}>{t.currentPassword}</Label>
          <Input id="recovery-email-password" type="password" autoComplete="current-password" className={securityInput} value={password}
            onChange={event => setPassword(event.target.value)} required />
        </div>
        <div className="flex flex-wrap gap-2"><Button className="h-11 font-semibold" disabled={busy || locked || !data}>{t.emailSave}</Button>
          {data?.state === 'pending' && <Button type="button" variant="outline" className="h-11" disabled={busy || locked || !password}
            onClick={() => { void save(true); }}>{t.emailResend}</Button>}
          {data?.address && <Button type="button" variant="ghost" className="h-11 text-destructive hover:text-destructive" disabled={busy || locked}
            onClick={() => setRemoving(true)}>{t.emailRemove}</Button>}
        </div>
      </form>
      {removing && <div role="alert" className="flex flex-col gap-2"><p className="text-sm text-muted-foreground">{t.emailRemoveConfirm}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" className="h-11 bg-destructive hover:bg-destructive/90" disabled={busy || locked || !password} onClick={() => { void remove(); }}>{t.emailConfirmRemove}</Button>
          <Button variant="ghost" className="h-11" onClick={() => setRemoving(false)}>{t.cancel}</Button>
        </div></div>}
    </>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {twoFactor.dialog}
  </SecurityRow>;
};
