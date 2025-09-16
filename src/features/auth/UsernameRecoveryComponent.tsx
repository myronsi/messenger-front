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

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UsernameRecoveryComponentProps {
  onBackToLogin: () => void;
}

const UsernameRecoveryComponent: React.FC<UsernameRecoveryComponentProps> = ({ onBackToLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const handleUsernameSubmit = useCallback(async () => {
    if (!username || username.length < 3) {
      setMessage(translations.usernameTooShort);
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${BASE_URL}/auth/get-cloud-part?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const cloudPart = data.encrypted_cloud_part;
        if (cloudPart) {
          const devicePart = getDevicePartForUsername(username);
          
          sessionStorage.setItem('recovery_username', username);
          sessionStorage.setItem('recovery_cloud_part', cloudPart);
          sessionStorage.setItem('recovery_device_part', devicePart);
          
          navigate('/recover-parts');
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
      setIsLoading(false);
    }
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
            disabled={!username || username.length < 3 || isLoading}
          >
            {isLoading ? (translations.loading) : (translations.continue)}
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
