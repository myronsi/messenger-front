
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';

interface RegisterComponentProps {
  onLoginSuccess: (username: string) => void;
  onBackToLogin: () => void;
}

const BASE_URL = "http://192.168.178.29:8000";

const RegisterComponent: React.FC<RegisterComponentProps> = ({ onLoginSuccess, onBackToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { translations } = useLanguage();

  const handleRegister = async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
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

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-foreground text-center">
        {translations.register}
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
        onClick={handleRegister}
        className="w-full"
      >
        {translations.register}
      </Button>
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          {translations.alreadyHaveAccount}
        </p>
        <Button
          variant="outline"
          onClick={onBackToLogin}
          className="w-full mt-2"
        >
          {translations.backToLogin}
        </Button>
      </div>
      {message && <p className="text-destructive text-sm mt-2">{message}</p>}
    </div>
  );
};

export default RegisterComponent;
