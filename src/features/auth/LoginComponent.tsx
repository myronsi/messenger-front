import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface LoginComponentProps {
  onLoginSuccess: (username: string) => void;
  onRegisterClick: () => void;
  onRecoverClick: () => void;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onLoginSuccess, onRegisterClick, onRecoverClick }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { translations } = useLanguage();

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
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('grant_type', 'password');
      formData.append('scope', '');
      formData.append('client_id', 'string');
      formData.append('client_secret', '********');

      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        onLoginSuccess(username);
      } else {
        setMessage(data.detail || translations.loginFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Login error:', err);
    }
  }, [username, password, translations, onLoginSuccess]);

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-foreground text-center">{translations.login}</h2>
      <input
        type="text"
        placeholder={translations.username}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="password"
        placeholder={translations.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button onClick={handleLogin} className="w-full" disabled={!username || !password}>
        {translations.login}
      </Button>
      <div className="flex flex-col gap-2 mt-4">
        <Button
          variant="ghost"
          onClick={onRecoverClick}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          {translations.forgotPassword}
        </Button>
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">{translations.noAccount}</p>
          <Button variant="outline" onClick={onRegisterClick} className="w-full">
            {translations.register}
          </Button>
        </div>
      </div>
      {message && <p className="text-destructive text-sm mt-2 text-center">{message}</p>}
    </div>
  );
};

export default LoginComponent;
