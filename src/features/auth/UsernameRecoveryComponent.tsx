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
import { Link, useNavigate } from 'react-router-dom';
import ForgotUsernameDialog from './ForgotUsernameDialog';

interface UsernameRecoveryComponentProps {
  onBackToLogin: () => void;
}

const UsernameRecoveryComponent: React.FC<UsernameRecoveryComponentProps> = ({ onBackToLogin }) => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const { translations } = useLanguage();
  const navigate = useNavigate();

  const getDevicePartForUsername = (username: string): string => {
    try {
      const deviceParts = JSON.parse(localStorage.getItem('device_parts') || '{}');
      return deviceParts[username] || localStorage.getItem('device_part') || '';
    } catch {
      return localStorage.getItem('device_part') || '';
    }
  };

  const handleUsernameSubmit = useCallback(() => {
    const normalized = username.trim().toLowerCase();
    if (!normalized || normalized.length < 3) {
      setMessage(translations.usernameTooShort);
      return;
    }

    setMessage('');
    sessionStorage.setItem('recovery_username', normalized);
    sessionStorage.setItem('recovery_device_part', getDevicePartForUsername(normalized));
    navigate('/recover-parts');
  }, [username, translations, navigate]);

  const handleForgotUsername = () => {
    setShowForgotDialog(true);
  };

  const handleUsernameSelected = (selectedUsername: string) => {
    setUsername(selectedUsername);
    setMessage('');
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-center">
            {translations.recoverPassword}
          </CardTitle>
          <CardDescription className="text-center">
            {translations.enterUsernameToRecover}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center relative">
                <Label htmlFor="username">{translations.username}</Label>
                <button
                    type="button"
                    onClick={handleForgotUsername}
                    className="ml-auto text-sm text-muted-foreground hover:underline"
                >
                    {translations.forgotUsername}
                </button>
            </div>
            <Input
              id="username"
              type="text"
              placeholder={translations.username}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
            />
          </div>
          {message && (
            <p className={`text-sm text-center ${
              message === (translations.userNotFound) 
                ? 'text-orange-500' 
                : 'text-destructive'
            }`}>
              {message}
              {message === (translations.userNotFound) && (
                <>
                  {' '}
                  <Link to="/register" className="text-blue-500 underline">
                    {translations.register}
                  </Link>
                </>
              )}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            onClick={handleUsernameSubmit}
            className="w-full"
            disabled={!username || username.length < 3}
          >
            {translations.continue}
          </Button>
          <Button
            variant="outline"
            onClick={onBackToLogin}
            className="w-full"
          >
            {translations.backToLogin}
          </Button>
        </CardFooter>
      </Card>
      
      <ForgotUsernameDialog
        isOpen={showForgotDialog}
        onClose={() => setShowForgotDialog(false)}
        onSelectUsername={handleUsernameSelected}
      />
    </div>
  );
};

export default UsernameRecoveryComponent;
