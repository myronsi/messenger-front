import { asApiError } from '@/shared/lib/apiError';
import { PasskeySignIn } from './components/PasskeySignIn';
import { QrSignIn } from './components/QrSignIn';
import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { AuthDivider, AuthField, AuthHeader, AuthSwitchLink, PasswordInput } from './components/AuthFormParts';
import { authInputClass } from './components/authFieldStyles';
import { QrCode } from 'lucide-react';
import { useLoginMutation, useLoginTwoFactorMutation } from './api/authApi';
import { setAccessToken } from '@/shared/auth/session';
import { problemCode } from '@/shared/api/problem';
import { isTwoFactorCancelled, useTwoFactorConfirm } from '@/shared/ui/useTwoFactorConfirm';

const isWrongLoginCode = (error: unknown) => ['invalid_credentials', 'invalid_two_factor_code'].includes(problemCode(error) ?? '');

interface LoginComponentProps {
  onLoginSuccess: (username: string) => void;
  onRegisterClick: () => void;
  onRecoverClick: () => void;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onLoginSuccess, onRegisterClick, onRecoverClick }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(() => { const notice = sessionStorage.getItem('security_notice') || ''; sessionStorage.removeItem('security_notice'); return notice; });
  const [qrMode, setQrMode] = useState(false);
  const twoFactor = useTwoFactorConfirm();
  const { ask } = twoFactor;
  const { translations } = useLanguage();
  const t = translations.signInScreen;

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [loginTwoFactor] = useLoginTwoFactorMutation();

  const handleLogin = useCallback(async () => {
    if (!username || username.length < 3) {
      setMessage(translations.usernameTooShort);
      return;
    }
    if (!password) {
      setMessage(translations.missingFields);
      return;
    }
    
    try {
      const first = await login({ username, password }).unwrap();
      const challenge = first.two_factor_required ? first.login_challenge : undefined;
      setMessage('');
      const result = challenge ? await ask(code => loginTwoFactor({ login_challenge: challenge, code }).unwrap(), isWrongLoginCode) : first;
      if (!result.access_token) {
        setMessage(translations.loginFailed);
        return;
      }
      setAccessToken(result.access_token);
      onLoginSuccess(username);
      setMessage('');
    } catch (caught) {
      if (isTwoFactorCancelled(caught)) return;
      const error = asApiError(caught);
      const errorMessage = error?.data?.detail || error?.message || translations.loginFailed;
      setMessage(errorMessage);
      console.error('Login error:', error);
    }
  }, [username, password, translations, onLoginSuccess, login, loginTwoFactor, ask]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  if (qrMode) {
    return <QrSignIn onSignedIn={onLoginSuccess} onBack={() => setQrMode(false)} />;
  }
  return (
    <div className="flex w-full flex-col gap-6">
      <AuthHeader title={t.title} subtitle={t.subtitle} />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <AuthField id="username" label={translations.username}>
          <Input
            id="username"
            autoComplete="username webauthn"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={authInputClass()}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </AuthField>

        <AuthField id="password" label={translations.password} labelAside={(
          <button type="button" onClick={onRecoverClick}
            className="rounded-sm text-[13px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t.forgotPassword}
          </button>
        )}>
          <PasswordInput id="password" autoComplete="current-password" value={password} showLabel={t.holdToShowPassword}
            onChange={(e) => setPassword(e.target.value)} />
        </AuthField>

        <Button type="submit" className="mt-1 h-11 w-full text-[15px] font-semibold" disabled={isLoginLoading || !username.trim() || !password}>
          {isLoginLoading ? translations.loading || 'Loading...' : t.submit}
        </Button>
      </form>

      {message && <p role="alert" className="-mt-2 text-center text-sm text-destructive">{message}</p>}

      <AuthDivider label={t.or} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-start gap-2.5">
        <PasskeySignIn username={username} onSignedIn={onLoginSuccess} compact />
        <Button type="button" variant="outline" aria-label={translations.qrLogin.signInButton}
          className="h-11 w-full gap-2.5 border-input text-[15px] [&_svg]:size-[18px]"
          onClick={() => setQrMode(true)}><QrCode aria-hidden="true" />{translations.authLayout.qrShort}</Button>
      </div>

      <AuthSwitchLink prompt={t.newHere} action={t.createAccount} onClick={onRegisterClick} />
      {twoFactor.dialog}
    </div>
  );
};

export default LoginComponent;
