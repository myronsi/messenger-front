import { useEffect, useState } from 'react';
import {
  useChangePasswordMutation,
  useConfirmTwoFactorMutation,
  useDisableTwoFactorMutation,
  useGetSecuritySettingsQuery,
  useGetSessionsQuery,
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
  useSetupTwoFactorMutation,
  useUpdateSessionDurationMutation,
} from '@/app/api/messengerApi';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { clearAuthTokens } from '@/shared/auth/session';

type StatusMessage = { type: 'success' | 'error'; text: string };

export const useSecuritySettings = (isActive: boolean, onLoggedOut: () => void) => {
  const { translations } = useLanguage();
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
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });
  const [isSessionDurationOpen, setIsSessionDurationOpen] = useState(false);

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
    } catch (error: any) {
      showStatus('error', error?.data?.detail || 'Failed to change password');
    }
  };

  const handleStartTwoFactor = async () => {
    try {
      setRecoveryCodes([]);
      setTwoFactorSetup(await setupTwoFactor().unwrap());
      setStatus(null);
    } catch (error: any) {
      showStatus('error', error?.data?.detail || 'Failed to start two-factor setup');
    }
  };

  const handleConfirmTwoFactor = async () => {
    try {
      const result = await confirmTwoFactor(twoFactorCode).unwrap();
      setRecoveryCodes(result.recovery_codes || []);
      setTwoFactorCode('');
      setTwoFactorSetup(null);
      showStatus('success', translations.saved || 'Saved');
    } catch (error: any) {
      showStatus('error', error?.data?.detail || 'Failed to enable two-factor authentication');
    }
  };

  const handleDisableTwoFactor = async () => {
    try {
      await disableTwoFactor(disableForm).unwrap();
      setDisableForm({ password: '', code: '' });
      setRecoveryCodes([]);
      showStatus('success', translations.saved || 'Saved');
    } catch (error: any) {
      showStatus('error', error?.data?.detail || 'Failed to disable two-factor authentication');
    }
  };

  const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
    try {
      await revokeSession(sessionId).unwrap();
      if (isCurrent) {
        clearAuthTokens();
        onLoggedOut();
      }
    } catch (error: any) {
      showStatus('error', error?.data?.detail || 'Failed to revoke session');
    }
  };

  const handleUpdateSessionDuration = async (value: string) => {
    try {
      await updateSessionDuration(Number(value)).unwrap();
      showStatus('success', translations.saved || 'Saved');
    } catch (error: any) {
      showStatus('error', error?.data?.detail || 'Failed to save session duration');
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      await revokeOtherSessions().unwrap();
      showStatus('success', translations.saved || 'Saved');
    } catch (error: any) {
      showStatus('error', error?.data?.detail || 'Failed to sign out other devices');
    }
  };

  return {
    translations, securitySettings, sessionsData, isLoadingSecurity, isLoadingSessions,
    isRevokingOthers, isChangingPassword, isSettingUp2fa, isConfirming2fa, isDisabling2fa,
    status, passwordForm, setPasswordForm, twoFactorSetup, twoFactorCode, setTwoFactorCode,
    recoveryCodes, disableForm, setDisableForm, isSessionDurationOpen, setIsSessionDurationOpen,
    handleChangePassword, handleStartTwoFactor, handleConfirmTwoFactor, handleDisableTwoFactor,
    handleRevokeSession, handleUpdateSessionDuration, handleRevokeOtherSessions,
  };
};
