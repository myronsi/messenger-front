import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, Shield, Smartphone, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { useSecuritySettings } from './useSecuritySettings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

interface SecuritySettingsPanelProps {
  isActive: boolean;
  onBack: () => void;
  onLoggedOut: () => void;
}

const shortDeviceLabel = (userAgent: string) => {
  if (!userAgent) return 'Unknown device';
  const browser = userAgent.includes('Firefox')
    ? 'Firefox'
    : userAgent.includes('Edg')
    ? 'Edge'
    : userAgent.includes('Chrome')
    ? 'Chrome'
    : userAgent.includes('Safari')
    ? 'Safari'
    : 'Browser';
  const os = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('Mac OS')
    ? 'macOS'
    : userAgent.includes('Android')
    ? 'Android'
    : userAgent.includes('iPhone') || userAgent.includes('iPad')
    ? 'iOS'
    : userAgent.includes('Linux')
    ? 'Linux'
    : 'Device';
  return `${browser} on ${os}`;
};

const sessionDurationOptions = [
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
];

const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({ isActive, onBack, onLoggedOut }) => {
  const { translations, securitySettings, sessionsData, isLoadingSecurity, isLoadingSessions, isRevokingOthers, isChangingPassword, isSettingUp2fa, isConfirming2fa, isDisabling2fa, status, passwordForm, setPasswordForm, twoFactorSetup, twoFactorCode, setTwoFactorCode, recoveryCodes, disableForm, setDisableForm, isSessionDurationOpen, setIsSessionDurationOpen, handleChangePassword, handleStartTwoFactor, handleConfirmTwoFactor, handleDisableTwoFactor, handleRevokeSession, handleUpdateSessionDuration, handleRevokeOtherSessions } = useSecuritySettings(isActive, onLoggedOut);

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="border-b border-border px-5 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="cursor-pointer">
                <button type="button" onClick={onBack}>
                  {translations.profile || 'Profile'}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="cursor-pointer">
                <button type="button" onClick={onBack}>
                  {translations.settings || 'Settings'}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                {translations.securityDevices || 'Security & devices'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {status && (
        <div
          aria-live="polite"
          className={`pointer-events-none absolute right-4 top-[58px] z-10 inline-flex max-w-[min(18rem,calc(100%-2rem))] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span className="truncate">{status.text}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <section className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-muted-foreground" />
              {translations.sessionDuration || 'Session duration'}
            </div>
            {isLoadingSecurity ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Select
                open={isSessionDurationOpen}
                onOpenChange={setIsSessionDurationOpen}
                value={String(securitySettings?.session_duration_days || 90)}
                onValueChange={(value) => {
                  setIsSessionDurationOpen(false);
                  void handleUpdateSessionDuration(value);
                }}
              >
                <SelectTrigger
                  className="w-full"
                  onPointerDown={(event) => {
                    if (isSessionDurationOpen) {
                      event.preventDefault();
                      setIsSessionDurationOpen(false);
                    }
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="z-[1300]"
                  onEscapeKeyDown={() => setIsSessionDurationOpen(false)}
                  onFocusOutside={() => setIsSessionDurationOpen(false)}
                  onPointerDownOutside={() => setIsSessionDurationOpen(false)}
                >
                  {sessionDurationOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                {translations.activeSessions || 'Active sessions'}
              </div>
              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                disabled={isRevokingOthers}
                className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                {translations.signOutOtherDevices || 'Sign out other devices'}
              </button>
            </div>
            <div className="rounded-md border border-border">
              {isLoadingSessions ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {translations.loading || 'Loading...'}
                </div>
              ) : (
                (sessionsData?.sessions || []).map((session) => (
                  <div key={session.id} className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {shortDeviceLabel(session.user_agent)}
                        {session.is_current && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{translations.current || 'Current'}</span>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {session.ip_address || 'IP hidden'} · {translations.lastActive || 'Last active'} {new Date(session.last_active_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.id, session.is_current)}
                      className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                      title={translations.logout || 'Logout'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="mb-3 text-sm font-medium">{translations.changePassword || 'Change password'}</div>
            <div className="space-y-2">
              <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, currentPassword: event.target.value }))} placeholder={translations.currentPassword || 'Current password'} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
              <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, newPassword: event.target.value }))} placeholder={translations.newPassword || 'New password'} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
              <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, confirmPassword: event.target.value }))} placeholder={translations.confirmPassword || 'Confirm password'} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
              <button type="button" onClick={handleChangePassword} disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {isChangingPassword ? translations.loading || 'Loading...' : translations.save || 'Save'}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="mb-3 text-sm font-medium">{translations.twoFactorAuthentication || 'Two-factor authentication'}</div>
            {securitySettings?.two_factor_enabled ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{translations.twoFactorEnabled || 'Two-factor authentication is enabled.'}</p>
                <input type="password" value={disableForm.password} onChange={(event) => setDisableForm((form) => ({ ...form, password: event.target.value }))} placeholder={translations.password || 'Password'} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
                <input value={disableForm.code} onChange={(event) => setDisableForm((form) => ({ ...form, code: event.target.value }))} placeholder={translations.verificationCode || 'Verification code'} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
                <button type="button" onClick={handleDisableTwoFactor} disabled={isDisabling2fa || !disableForm.password || !disableForm.code} className="w-full rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
                  {translations.disable || 'Disable'}
                </button>
              </div>
            ) : twoFactorSetup ? (
              <div className="space-y-3">
                <div className="flex justify-center rounded-md bg-white p-4">
                  <QRCodeSVG value={twoFactorSetup.otpauth_uri} size={180} />
                </div>
                <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs">{twoFactorSetup.secret}</div>
                <input value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} placeholder={translations.verificationCode || 'Verification code'} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
                <button type="button" onClick={handleConfirmTwoFactor} disabled={isConfirming2fa || !twoFactorCode.trim()} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {translations.enable || 'Enable'}
                </button>
              </div>
            ) : (
              <button type="button" onClick={handleStartTwoFactor} disabled={isSettingUp2fa} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {isSettingUp2fa ? translations.loading || 'Loading...' : translations.enable || 'Enable'}
              </button>
            )}

            {recoveryCodes.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="mb-2 text-sm font-medium text-amber-900">{translations.saveRecoveryCodes || 'Save these recovery codes now.'}</div>
                <div className="grid gap-1 font-mono text-xs text-amber-950">
                  {recoveryCodes.map((code) => <span key={code}>{code}</span>)}
                </div>
              </div>
            )}
          </section>
      </div>
    </div>
  );
};

export default SecuritySettingsPanel;
