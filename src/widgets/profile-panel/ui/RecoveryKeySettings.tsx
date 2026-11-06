import { recoveryApi, useGetCurrentUserQuery, useGetRecoveryKeyStatusQuery } from '@/features/profile';
import { apiClient } from '@/shared/api/client';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';
import { ApiProblem } from '@/shared/api/problem';
import { isTwoFactorCancelled } from '@/shared/ui/useTwoFactorConfirm';
import { useAccountTwoFactor } from '../model/useAccountTwoFactor';
import { SecurityRow, securityInput, securityLabel } from './SecuritySection';

export interface CreatedRecoveryKey {
  recoveryKey: string;
  username: string;
}

export const RecoveryKeySettings = ({ onDismissSafetyChange, onCreated }: {
  onDismissSafetyChange?: (blocked: boolean) => void; onCreated?: (created: CreatedRecoveryKey) => void;
}) => {
  const { translations, language } = useLanguage();
  const t = translations.securityPage;
  const { data: user } = useGetCurrentUserQuery();
  const { data: status, error: loadError } = useGetRecoveryKeyStatusQuery();
  const dispatch = useAppDispatch();
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const twoFactor = useAccountTwoFactor();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { onDismissSafetyChange?.(busy || Boolean(key)); }, [busy, key, onDismissSafetyChange]);
  useEffect(() => () => onDismissSafetyChange?.(false), [onDismissSafetyChange]);
  const locked = Boolean(status?.locked_until && new Date(status.locked_until).getTime() > Date.now());
  const locale = language === 'ru' ? 'ru-RU' : undefined;
  const create = async () => {
    onDismissSafetyChange?.(true);
    setBusy(true); setError('');
    try {
      const recoveryKey = await twoFactor.confirm(async code => {
        const result = await apiClient.POST('/me/recovery-key', { body: { password, ...(code ? { code } : {}) } });
        if (result.error || !result.data?.recovery_key) {
          throw new ApiProblem(result.response.status, result.error, result.response.status === 409 ? t.keyLockedFailure : t.keyCheckCredentials);
        }
        return result.data.recovery_key;
      });
      setPassword('');
      if (onCreated) onCreated({ recoveryKey, username: user?.username || '' });
      else setKey(recoveryKey);
      dispatch(recoveryApi.util.invalidateTags(['Auth']));
    } catch (e) { if (!isTwoFactorCancelled(e)) setError(e instanceof Error ? e.message : t.keyCreateFailed); }
    finally { setBusy(false); }
  };
  const description = !status ? t.keyLoading : status.exists
    ? [t.keyExists, status.created_at && fillTemplate(t.keyCreatedOn, { date: new Date(status.created_at).toLocaleDateString(locale) }), t.keyReplaceHint]
      .filter(Boolean).join(' ')
    : t.keyMissing;
  return <SecurityRow id="recovery-key-settings" title={t.keyTitle} description={key ? undefined : description}>
    {key ? <RecoveryKeyReceipt recoveryKey={key} username={user?.username || ''} onContinue={() => setKey('')} /> : <>
      {locked ? <p className="text-sm text-muted-foreground">{fillTemplate(t.lockedUntil, { date: new Date(status!.locked_until!).toLocaleString(locale) })}</p>
        : status && <form id="recovery-key-form" className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); void create(); }}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recovery-password" className={securityLabel}>{t.currentPassword}</Label>
            <Input id="recovery-password" type="password" autoComplete="current-password" className={securityInput} value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="h-11 font-semibold" disabled={busy}>{busy ? t.keyCreating : status.exists ? t.keyReplace : t.keyCreate}</Button>
          </div>
        </form>}
    </>}
    {loadError && <p role="alert" className="text-sm text-red-700">{t.keyLoadFailed}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {twoFactor.dialog}
  </SecurityRow>;
};
