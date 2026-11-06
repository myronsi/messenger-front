import { asApiError } from '@/shared/lib/apiError';
import { useEffect, useState } from 'react';
import { useChangePasswordMutation, useConfirmTwoFactorMutation, useDisableTwoFactorMutation, useGetSecuritySettingsQuery, useGetSessionsQuery, useRevokeOtherSessionsMutation, useRevokeSessionMutation, useSetupTwoFactorMutation, useUpdateSessionDurationMutation } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { clearAuthTokens } from '@/shared/auth/session';
import { isTwoFactorCancelled, useTwoFactorConfirm } from '@/shared/ui/useTwoFactorConfirm';

type StatusMessage = { type: 'success' | 'error'; text: string };

export const useSecuritySettings = (isActive: boolean, onLoggedOut: () => void) => {
  const { translations } = useLanguage();
  const securityPage = translations.securityPage;
  const { data: securitySettings, isLoading: isLoadingSecurity } = useGetSecuritySettingsQuery(undefined, { skip: !isActive });
  const { data: sessionsData, isLoading: isLoadingSessions } = useGetSessionsQuery(undefined, { skip: !isActive });
  const [updateSessionDuration] = useUpdateSessionDurationMutation();
  const [revokeSession] = useRevokeSessionMutation();
  const [revokeOtherSessions, { isLoading: isRevokingOthers }] = useRevokeOtherSessionsMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [setupTwoFactor, { isLoading: isSettingUp2fa }] = useSetupTwoFactorMutation();
  const [confirmTwoFactor, { isLoading: isConfirming2fa }] = useConfirmTwoFactorMutation();
  const [disableTwoFactor, { isLoading: isDisabling2fa }] = useDisableTwoFactorMutation();
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [setupPassword, setSetupPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disableForm, setDisableForm] = useState({ password: '' });
  const [isSessionDurationOpen, setIsSessionDurationOpen] = useState(false);
  const twoFactor = useTwoFactorConfirm(securitySettings?.two_factor_enabled);

  useEffect(() => {
    if (!isActive) setIsSessionDurationOpen(false);
  }, [isActive]);

  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(null), status.type === 'success' ? 2200 : 4000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const showStatus = (type: StatusMessage['type'], text: string) => setStatus({ type, text });

  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 8) {
      showStatus('error', translations.passwordTooShort || 'Password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showStatus('error', translations.passwordsDoNotMatch || 'Passwords do not match');
      return;
    }
    try {
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }).unwrap();
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showStatus('success', translations.saved || 'Saved');
    } catch (caught) {
      const error = asApiError(caught);
      showStatus('error', error?.data?.detail || securityPage.changePasswordFailed);
    }
  };

  const handleStartTwoFactor = async () => {
    try {
      setRecoveryCodes([]);
      setTwoFactorSetup(await setupTwoFactor(setupPassword).unwrap());
      setSetupPassword('');
      setStatus(null);
    } catch (caught) {
      const error = asApiError(caught);
      showStatus('error', error?.data?.detail || securityPage.startTwoFactorFailed);
    }
  };

  const handleConfirmTwoFactor = async () => {
    try {
      const result = await twoFactor.ask(code => confirmTwoFactor(code).unwrap());
      setRecoveryCodes(result.recovery_codes || []);
      setTwoFactorSetup(null);
      showStatus('success', translations.saved || 'Saved');
    } catch (caught) {
      if (isTwoFactorCancelled(caught)) return;
      const error = asApiError(caught);
      showStatus('error', error?.data?.detail || securityPage.enableTwoFactorFailed);
    }
  };

  const handleDisableTwoFactor = async () => {
    try {
      await twoFactor.ask(code => disableTwoFactor({ password: disableForm.password, code }).unwrap());
      setDisableForm({ password: '' });
      setRecoveryCodes([]);
      showStatus('success', translations.saved || 'Saved');
    } catch (caught) {
      if (isTwoFactorCancelled(caught)) return;
      const error = asApiError(caught);
      showStatus('error', error?.data?.detail || securityPage.disableTwoFactorFailed);
    }
  };

  const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
    try {
      await revokeSession(sessionId).unwrap();
      if (isCurrent) {
        clearAuthTokens();
        onLoggedOut();
      }
    } catch (caught) {
      const error = asApiError(caught);
      showStatus('error', error?.data?.detail || securityPage.revokeSessionFailed);
    }
  };

  const handleUpdateSessionDuration = async (value: string) => {
    try {
      await updateSessionDuration(Number(value)).unwrap();
      showStatus('success', translations.saved || 'Saved');
    } catch (caught) {
      const error = asApiError(caught);
      showStatus('error', error?.data?.detail || securityPage.sessionDurationFailed);
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      await revokeOtherSessions().unwrap();
      showStatus('success', translations.saved || 'Saved');
    } catch (caught) {
      const error = asApiError(caught);
      showStatus('error', error?.data?.detail || securityPage.signOutOthersFailed);
    }
  };

  return {
    translations, securityPage, securitySettings, sessionsData, isLoadingSecurity, isLoadingSessions,
    isRevokingOthers, isChangingPassword, isSettingUp2fa, isConfirming2fa, isDisabling2fa,
    status, passwordForm, setPasswordForm, twoFactorSetup, twoFactorDialog: twoFactor.dialog,
    recoveryCodes, disableForm, setDisableForm, setupPassword, setSetupPassword, isSessionDurationOpen, setIsSessionDurationOpen,
    handleChangePassword, handleStartTwoFactor, handleConfirmTwoFactor, handleDisableTwoFactor,
    handleRevokeSession, handleUpdateSessionDuration, handleRevokeOtherSessions,
  };
};
