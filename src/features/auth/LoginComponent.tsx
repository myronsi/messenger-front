import { asApiError } from '@/shared/lib/apiError';
import { PasskeySignIn } from './components/PasskeySignIn';
import { QrSignIn } from './components/QrSignIn';
import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Eye, EyeOff, MessageSquare, QrCode } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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

  const fieldLabel = 'text-[13px] font-medium text-slate-700';
  if (qrMode) {
    return (
      <Card className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border-border p-6 shadow-sm sm:p-8">
        <QrSignIn onSignedIn={onLoginSuccess} onBack={() => setQrMode(false)} />
      </Card>
    );
  }
  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border-border p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-1.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary text-white">
          <MessageSquare className="h-[22px] w-[22px]" aria-hidden="true" />
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{t.title}</h1>
        <p className="text-sm text-slate-600">{t.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username" className={fieldLabel}>{translations.username}</Label>
          <Input
            id="username"
            autoComplete="username webauthn"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 border-slate-300 text-[15px]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="password" className={fieldLabel}>{translations.password}</Label>
            <button type="button" onClick={onRecoverClick} className="text-[13px] text-primary hover:underline">
              {t.forgotPassword}
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="h-11 border-slate-300 pr-11 text-[15px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={t.holdToShowPassword}
              aria-pressed={showPassword}
              onPointerDown={() => setShowPassword(true)}
              onPointerUp={() => setShowPassword(false)}
              onPointerCancel={() => setShowPassword(false)}
              onPointerLeave={() => setShowPassword(false)}
              onTouchEnd={() => setShowPassword(false)}
              onTouchCancel={() => setShowPassword(false)}
              onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setShowPassword(true); } }}
              onKeyUp={() => setShowPassword(false)}
              onBlur={() => setShowPassword(false)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-700"
            >
              {showPassword ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="h-11 w-full text-[15px] font-semibold" disabled={isLoginLoading}>
          {isLoginLoading ? translations.loading || 'Loading...' : t.submit}
        </Button>
      </form>

      {message && <p role="alert" className="text-center text-sm text-red-700">{message}</p>}

      <div className="flex items-center gap-3 text-xs text-slate-500" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />{t.or}<span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-2.5">
        <PasskeySignIn username={username} onSignedIn={onLoginSuccess} />
        <Button type="button" variant="outline" className="h-11 w-full gap-2.5 border-slate-300 text-[15px] [&_svg]:size-[18px]"
          onClick={() => setQrMode(true)}><QrCode aria-hidden="true" />{translations.qrLogin.signInButton}</Button>
      </div>

      <p className="text-center text-sm text-slate-600">
        {t.newHere}{' '}
        <button type="button" onClick={onRegisterClick} className="font-medium text-primary hover:underline">{t.createAccount}</button>
      </p>
      {twoFactor.dialog}
    </Card>
  );
};

export default LoginComponent;
