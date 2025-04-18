
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';

interface LoginComponentProps {
  onLoginSuccess: (username: string) => void;
  onRegisterClick: () => void;
}

const BASE_URL = "http://192.168.178.29:8000";

const LoginComponent: React.FC<LoginComponentProps> = ({ onLoginSuccess, onRegisterClick }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { translations } = useLanguage();

  const handleLogin = async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        onLoginSuccess(username);
      } else {
        setMessage(data.detail);
      }
    } catch (err) {
      setMessage(translations.networkError);
    }
  };

  const handleForgotPassword = () => {
    // Placeholder for forgot password functionality
    setMessage(translations.forgotPasswordNotImplemented);
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-foreground text-center">
        {translations.login}
      </h2>
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
      <Button
        onClick={handleLogin}
        className="w-full"
      >
        {translations.login}
      </Button>
      <div className="flex flex-col gap-2 mt-4">
        <Button
          variant="ghost"
          onClick={handleForgotPassword}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          {translations.forgotPassword}
        </Button>
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {translations.noAccount}
          </p>
          <Button
            variant="outline"
            onClick={onRegisterClick}
            className="w-full"
          >
            {translations.register}
          </Button>
        </div>
      </div>
      {message && <p className="text-destructive text-sm mt-2">{message}</p>}
    </div>
  );
};

export default LoginComponent;
