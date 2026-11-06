import { Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import type { useSecuritySettings } from './useSecuritySettings';
import { SecurityRow, securityInput, securityLabel } from './SecuritySection';

type Settings = ReturnType<typeof useSecuritySettings>;

export const PasswordRow = ({ settings }: { settings: Settings }) => {
  const { translations, securityPage: t, passwordForm, setPasswordForm, handleChangePassword, isChangingPassword } = settings;
  const fields = [
    { key: 'currentPassword', id: 'change-current-password', label: translations.currentPassword, autoComplete: 'current-password' },
    { key: 'newPassword', id: 'change-new-password', label: translations.newPassword, autoComplete: 'new-password' },
    { key: 'confirmPassword', id: 'change-confirm-password', label: translations.confirmPassword, autoComplete: 'new-password' },
  ] as const;
  return <SecurityRow id="password-settings" region title={t.passwordTitle} description={t.passwordHint}>
    <form id="change-password-form" className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); void handleChangePassword(); }}>
      {fields.map(field => <div key={field.key} className="flex flex-col gap-1.5">
        <Label htmlFor={field.id} className={securityLabel}>{field.label}</Label>
        <Input id={field.id} type="password" autoComplete={field.autoComplete} className={securityInput} value={passwordForm[field.key]}
          onChange={event => setPasswordForm(form => ({ ...form, [field.key]: event.target.value }))} />
      </div>)}
      <div className="flex flex-wrap gap-2">
        <Button className="h-11 font-semibold"
          disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}>
          {isChangingPassword ? translations.loading : translations.save}
        </Button>
      </div>
    </form>
  </SecurityRow>;
};

export const TwoFactorRow = ({ settings }: { settings: Settings }) => {
  const {
    translations, securityPage: t, securitySettings, isLoadingSecurity, twoFactorSetup, recoveryCodes,
    disableForm, setDisableForm, setupPassword, setSetupPassword, handleStartTwoFactor, handleConfirmTwoFactor, handleDisableTwoFactor,
    isSettingUp2fa, isConfirming2fa, isDisabling2fa,
  } = settings;
  const enabled = Boolean(securitySettings?.two_factor_enabled);
  const badge = !isLoadingSecurity && securitySettings && <Badge className={enabled
    ? 'border-transparent bg-green-100 px-2 py-0.5 text-[11px] text-green-800 hover:bg-green-100'
    : 'border-transparent bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted'}>{enabled ? t.twoFactorOn : t.twoFactorOff}</Badge>;
  return <SecurityRow id="two-factor-settings" region title={translations.twoFactorAuthentication} badge={badge}
    description={enabled ? t.twoFactorOnHint : t.twoFactorOffHint}>
    {isLoadingSecurity ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : enabled ? <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{translations.twoFactorEnabled}</p>
      <Input type="password" aria-label={translations.password} value={disableForm.password} className={securityInput} placeholder={translations.password}
        onChange={(event) => setDisableForm((form) => ({ ...form, password: event.target.value }))} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11 border-red-200 font-semibold text-red-700 hover:bg-red-50 hover:text-red-800"
          disabled={isDisabling2fa || !disableForm.password} onClick={handleDisableTwoFactor}>{translations.disable}</Button>
      </div>
    </div> : twoFactorSetup ? <div className="flex flex-col gap-3">
      <div className="flex justify-center rounded-md bg-white p-4"><QRCodeSVG value={twoFactorSetup.otpauth_uri} size={180} /></div>
      <div className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">{twoFactorSetup.secret}</div>
      <Button className="h-11 font-semibold" onClick={handleConfirmTwoFactor} disabled={isConfirming2fa}>{translations.enable}</Button>
    </div> : <div className="flex flex-col gap-2">
      <Input type="password" autoComplete="current-password" aria-label={t.twoFactorPassword} className={securityInput}
        value={setupPassword} onChange={event => setSetupPassword(event.target.value)} placeholder={translations.password} />
      <div className="flex flex-wrap gap-2">
        <Button className="h-11 font-semibold" onClick={handleStartTwoFactor} disabled={isSettingUp2fa || !setupPassword}>
          {isSettingUp2fa ? translations.loading : translations.enable}
        </Button>
      </div>
    </div>}
    {recoveryCodes.length > 0 && <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <div className="mb-2 text-sm font-medium text-amber-900">{translations.saveRecoveryCodes}</div>
      <div className="grid gap-1 font-mono text-xs text-amber-950">{recoveryCodes.map((code) => <span key={code}>{code}</span>)}</div>
    </div>}
  </SecurityRow>;
};
