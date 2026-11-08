import { useState } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Monitor, Smartphone } from 'lucide-react';
import { recoveryApi, useGetPasskeysQuery } from '@/features/profile';
import { apiClient } from '@/shared/api/client';
import { registerPasskey } from '@/shared/api/passkeys';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { isTwoFactorCancelled } from '@/shared/ui/useTwoFactorConfirm';
import { hasRecoveryBesidesPasskeys, type RecoveryOverview } from '../model/recoveryMethods';
import { useAccountTwoFactor } from '../model/useAccountTwoFactor';
import { SecurityRow, securityInput, securityLabel } from './SecuritySection';
import { localeOf } from '@/shared/lang/languages';

const isPhone = (name: string) => /phone|android|ios|ipad|pixel|galaxy|mobile/i.test(name);

export const PasskeySettings = ({ locked, enabled, overview }: { locked: boolean; enabled: boolean; overview?: RecoveryOverview }) => {
  const { translations, language } = useLanguage();
  const t = translations.securityPage;
  const { data: keys = [], isLoading, error: loadError } = useGetPasskeysQuery(undefined, { skip: !enabled });
  const dispatch = useAppDispatch();
  const [name, setName] = useState(() => deviceLabel(navigator.userAgent));
  const [password, setPassword] = useState('');
  const twoFactor = useAccountTwoFactor();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [renamed, setRenamed] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const supported = browserSupportsWebAuthn();
  const locale = localeOf(language);
  const removingLast = keys.length === 1 && Boolean(removing);
  const lastMethod = removingLast && overview !== undefined && !hasRecoveryBesidesPasskeys(overview);
  const refresh = () => dispatch(recoveryApi.util.invalidateTags(['Auth']));
  const add = async () => {
    setBusy(true); setMessage('');
    try { await twoFactor.confirm(code => registerPasskey({ name, password, ...(code ? { code } : {}) })); setPassword(''); setMessage(t.passkeyAdded); refresh(); }
    catch (error) { if (!isTwoFactorCancelled(error)) setMessage(error instanceof Error ? error.message : t.passkeyCancelled); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!removing) return;
    setBusy(true); setMessage('');
    try {
      const result = await apiClient.DELETE('/auth/passkeys/{passkeyId}', { params: { path: { passkeyId: removing } }, body: { password } });
      if (result.error) throw new Error();
      setRemoving(null); setPassword(''); setMessage(t.passkeyRemoved); refresh();
    } catch { setMessage(t.passkeyRemoveFailed); }
    finally { setBusy(false); }
  };
  const rename = async () => {
    if (!editing) return;
    setBusy(true); setMessage('');
    try {
      const result = await apiClient.PATCH('/auth/passkeys/{passkeyId}', { params: { path: { passkeyId: editing } }, body: { name: renamed } });
      if (result.error) throw new Error();
      setEditing(null); setRenamed(''); refresh();
    } catch { setMessage(t.passkeyRenameFailed); }
    finally { setBusy(false); }
  };
  const formatDate = (value: string) => new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return <SecurityRow id="passkey-settings" region title={t.passkeysTitle} description={t.passkeysDescription}>
    {!enabled ? <p className="text-sm text-muted-foreground">{t.passkeysUnavailable}</p> : <>
      {isLoading && <p role="status" className="text-sm text-muted-foreground">{t.passkeysLoading}</p>}
      {loadError && <p role="alert" className="text-sm text-destructive">{t.passkeysLoadFailed}</p>}
      {!isLoading && !loadError && !keys.length && <p className="text-sm text-muted-foreground">{t.noPasskeys}</p>}
      {keys.length > 0 && <ul className="flex flex-col gap-2">{keys.map(key => <li key={key.id}
        className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3">
        {isPhone(key.name) ? <Smartphone className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> : <Monitor className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
        <div className="min-w-40 flex-1">
          <p className="text-sm font-medium text-foreground">{key.name}</p>
          <p className="text-xs text-muted-foreground">{fillTemplate(t.passkeyMeta, {
            created: formatDate(key.created_at), used: key.last_used_at ? new Date(key.last_used_at).toLocaleString(locale) : t.never,
          })}</p>
        </div>
        <Button variant="ghost" className="h-11 px-2.5 text-[13px] text-muted-foreground" disabled={busy || locked}
          aria-label={fillTemplate(t.renameLabel, { name: key.name })} onClick={() => { setEditing(key.id); setRenamed(key.name); }}>{t.rename}</Button>
        <Button variant="ghost" className="h-11 px-2.5 text-[13px] text-destructive hover:text-destructive" disabled={busy || locked}
          aria-label={fillTemplate(t.removeLabel, { name: key.name })}
          onClick={() => { setRemoving(key.id); setPassword(''); }}>{t.remove}</Button>
      </li>)}</ul>}
      {editing && <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void rename(); }}>
        <Input aria-label={t.newPasskeyName} value={renamed} onChange={event => setRenamed(event.target.value)} maxLength={64} required
          className={`${securityInput} min-w-40 flex-1`} />
        <Button className="h-11" disabled={busy || locked}>{t.saveName}</Button>
        <Button type="button" variant="ghost" className="h-11" onClick={() => setEditing(null)}>{t.cancel}</Button>
      </form>}
      {removing && <div role="alert" className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t.removeConfirm}</p>
        {lastMethod && <p className="text-sm font-medium text-destructive">{t.lastMethodWarning}</p>}
        <Label htmlFor="remove-passkey-password" className={securityLabel}>{t.currentPassword}</Label>
        <Input id="remove-passkey-password" type="password" autoComplete="current-password" className={securityInput} value={password}
          onChange={event => setPassword(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" className="h-11 bg-destructive hover:bg-destructive/90" disabled={busy || locked || (keys.length === 1 && !password)}
            onClick={() => { void remove(); }}>{t.confirmRemoval}</Button>
          <Button variant="ghost" className="h-11" onClick={() => { setRemoving(null); setPassword(''); }}>{t.cancel}</Button>
        </div>
      </div>}
      {!supported ? <p className="text-sm text-muted-foreground">{t.noBrowserSupport}</p> : !removing && <form id="add-passkey-form" className="flex flex-col gap-3"
        onSubmit={event => { event.preventDefault(); void add(); }}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="passkey-name" className={securityLabel}>{t.passkeyName}</Label>
          <Input id="passkey-name" maxLength={64} value={name} required className={securityInput} onChange={e => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-passkey-password" className={securityLabel}>{t.currentPassword}</Label>
          <Input id="add-passkey-password" type="password" autoComplete="current-password" className={securityInput}
            value={password} onChange={event => setPassword(event.target.value)} required />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 font-semibold" disabled={busy || locked}>{busy ? t.waitingForPasskey : t.addPasskey}</Button>
        </div>
      </form>}
    </>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {twoFactor.dialog}
  </SecurityRow>;
};
