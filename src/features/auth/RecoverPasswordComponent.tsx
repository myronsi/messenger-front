import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { Link } from 'react-router-dom'; // Assuming react-router-dom for navigation

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface RecoverPasswordComponentProps {
  onBackToLogin: () => void;
}

const RecoverPasswordComponent: React.FC<RecoverPasswordComponentProps> = ({ onBackToLogin }) => {
  const [username, setUsername] = useState('');
  const [part1, setPart1] = useState(localStorage.getItem('device_part') || '');
  const [part2, setPart2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState('');
  const { translations } = useLanguage();

  const validatePartFormat = useCallback((part: string): boolean => {
    return /^[0-9a-f]+-[1-3]-[0-9a-f]+$/.test(part.trim());
  }, []);

  const handleFetchCloudPart = useCallback(async () => {
    if (!username) {
      setMessage(translations.missingUsername);
      return;
    }
    setIsFetching(true);
    setMessage('');
    try {
      const response = await fetch(`${BASE_URL}/auth/get-cloud-part?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        const cloudPart = data.encrypted_cloud_part;
        if (validatePartFormat(cloudPart)) {
          setPart2(cloudPart);
          setMessage(translations.cloudPartFetched);
        } else {
          setMessage(translations.invalidPartsFormat);
        }
      } else {
        if (data.detail === 'User not found') {
          setMessage(translations.userNotFound);
        } else if (data.detail === 'Cloud part not found') {
          setMessage(translations.cloudPartNotFound);
        } else {
          setMessage(translations.cloudPartFetchFailed);
        }
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Fetch cloud part error:', err);
    } finally {
      setIsFetching(false);
    }
  }, [username, translations, validatePartFormat]);

  const handleRecoverPassword = useCallback(async () => {
    if (!username || !part1 || !part2) {
      setMessage(translations.missingFields);
      return;
    }
    if (!validatePartFormat(part1) || !validatePartFormat(part2)) {
      setMessage(translations.invalidPartsFormat);
      return;
    }
    setIsFetching(true);
    setMessage('');
    try {
      const response = await fetch(`${BASE_URL}/auth/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, part1: part1.trim(), part2: part2.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setRecoveryToken(data.recovery_token);
        setIsResetting(true);
        setMessage(translations.recoverySuccess);
      } else {
        setMessage(data.detail || translations.recoveryFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Recovery error:', err);
    } finally {
      setIsFetching(false);
    }
  }, [username, part1, part2, translations, validatePartFormat]);

  const handleResetPassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      setMessage(translations.missingFields);
      return;
    }
    if (newPassword.length < 3) {
      setMessage(translations.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(translations.passwordsDoNotMatch);
      return;
    }
    setIsFetching(true);
    setMessage('');
    try {
      const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recovery_token: recoveryToken, new_password: newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(translations.resetPasswordSuccess);
        setIsResetting(false);
        setRecoveryToken('');
        setNewPassword('');
        setConfirmPassword('');
        setUsername('');
        setPart1(localStorage.getItem('device_part') || '');
        setPart2('');
      } else {
        setMessage(data.detail || translations.resetPasswordFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Reset password error:', err);
    } finally {
      setIsFetching(false);
    }
  }, [newPassword, confirmPassword, recoveryToken, translations]);

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-foreground text-center">
        {isResetting ? translations.resetPassword : translations.recoverPassword}
      </h2>
      {!isResetting ? (
        <>
          <input
            type="text"
            placeholder={translations.username}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={handleFetchCloudPart}
            className="w-full"
            disabled={!username || isFetching}
          >
            {isFetching ? translations.fetching : translations.confirmUsername}
          </Button>
          {message === translations.userNotFound && (
            <p className="text-sm text-center">
              {translations.userNotFound}{' '}
              <Link to="/register" className="text-blue-500 underline">
                {translations.registerHere}
              </Link>
            </p>
          )}
          <input
            type="text"
            placeholder={translations.part1}
            value={part1}
            onChange={(e) => setPart1(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            placeholder={translations.part2}
            value={part2}
            readOnly
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none"
          />
          <Button
            onClick={handleRecoverPassword}
            className="w-full"
            disabled={!username || !part1 || !part2 || isFetching}
          >
            {translations.recoverPassword}
          </Button>
        </>
      ) : (
        <>
          <input
            type="password"
            placeholder={translations.newPassword}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder={translations.confirmPassword}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={handleResetPassword}
            className="w-full"
            disabled={!newPassword || !confirmPassword || isFetching}
          >
            {translations.resetPassword}
          </Button>
        </>
      )}
      <Button
        variant="outline"
        onClick={() => {
          onBackToLogin();
          setIsResetting(false);
          setRecoveryToken('');
          setNewPassword('');
          setConfirmPassword('');
          setMessage('');
          setUsername('');
          setPart1(localStorage.getItem('device_part') || '');
          setPart2('');
        }}
        className="w-full mt-2"
      >
        {translations.backToLogin}
      </Button>
      {message && message !== translations.userNotFound && (
        <p className="text-destructive text-sm mt-2 text-center">{message}</p>
      )}
    </div>
  );
};

export default RecoverPasswordComponent;
