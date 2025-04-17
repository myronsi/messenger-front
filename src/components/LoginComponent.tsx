
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginComponentProps {
  onLoginSuccess: (username: string) => void;
}

const BASE_URL = "http://192.168.178.29:8000";

const LoginComponent: React.FC<LoginComponentProps> = ({ onLoginSuccess }) => {
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{translations.login}</h2>
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
      <button
        onClick={handleLogin}
        className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        {translations.login}
      </button>
      {message && <p className="text-destructive text-sm">{message}</p>}
    </div>
  );
};

export default LoginComponent;
