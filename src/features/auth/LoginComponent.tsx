import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useLoginMutation } from '@/app/api/messengerApi';

interface LoginComponentProps {
  onLoginSuccess: (username: string) => void;
  onRegisterClick: () => void;
  onRecoverClick: () => void;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onLoginSuccess, onRegisterClick, onRecoverClick }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { translations } = useLanguage();
  
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();

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
      const result = await login({ username, password }).unwrap();
      localStorage.setItem('access_token', result.access_token);
      if (result.refresh_token) {
        localStorage.setItem('refresh_token', result.refresh_token);
      }
      onLoginSuccess(username);
      setMessage('');
    } catch (error: any) {
      const errorMessage = error?.data?.detail || error?.message || translations.loginFailed;
      setMessage(errorMessage);
      console.error('Login error:', error);
    }
  }, [username, password, translations, onLoginSuccess, login]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const inputsFilled = Boolean(username && password);

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <div>
          <CardTitle>{translations.login}</CardTitle>
          <CardDescription className='pt-2'>{translations.loginToYourAccount}</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="username">{translations.username}</Label>
              <Input
                id="username"
                type="text"
                placeholder={translations.username}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center relative">
                <Label htmlFor="password">{translations.password}</Label>
                <button
                  type="button"
                  onClick={onRecoverClick}
                  className="ml-auto text-sm text-muted-foreground hover:underline"
                >
                  {translations.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={translations.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  onTouchCancel={() => setShowPassword(false)}
                  onPointerDown={() => setShowPassword(true)}
                  onPointerUp={() => setShowPassword(false)}
                  onPointerCancel={() => setShowPassword(false)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

          </div>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-2">
        {inputsFilled ? (
          <Button 
            type="submit" 
            onClick={handleLogin} 
            className="w-full"
            disabled={isLoginLoading}
          >
            {isLoginLoading ? translations.loading || 'Loading...' : translations.login}
          </Button>
        ) : (
          <div className="w-full">
            <p className="text-sm text-muted-foreground text-center mb-2">{translations.noAccount}</p>
            <Button variant="outline" onClick={onRegisterClick} className="w-full">
              {translations.register}
            </Button>
          </div>
        )}

        {message && <p className="text-destructive text-sm mt-2 text-center">{message}</p>}
      </CardFooter>
    </Card>
  );
};

export default LoginComponent;
