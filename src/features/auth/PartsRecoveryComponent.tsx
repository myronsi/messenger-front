import React, { useState, useCallback, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface PartsRecoveryComponentProps {
  onBackToLogin: () => void;
}

const PartsRecoveryComponent: React.FC<PartsRecoveryComponentProps> = () => {
  const [username, setUsername] = useState('');
  const [part1, setPart1] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPart1, setShowPart1] = useState(false);
  const { translations } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const recoveryUsername = sessionStorage.getItem('recovery_username');
    const recoveryDevicePart = sessionStorage.getItem('recovery_device_part');

    if (!recoveryUsername) {
      navigate('/recover-username');
      return;
    }

    setUsername(recoveryUsername);
    setPart1(recoveryDevicePart || '');
  }, [navigate]);

  const handleRecoverPassword = useCallback(async () => {
    if (!username || !part1) {
      setMessage(translations.missingFields);
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${BASE_URL}/auth/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, part1: part1.trim() }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        sessionStorage.setItem('recovery_token', data.recovery_token);
        
        navigate('/reset-password');
      } else {
        setMessage(data.detail || translations.recoveryFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Recovery error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [username, part1, translations, navigate]);

  const handleBack = () => {
    sessionStorage.removeItem('recovery_username');
    sessionStorage.removeItem('recovery_device_part');
    sessionStorage.removeItem('recovery_token');
    navigate('/recover-username');
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-center">
            {translations.recoverPassword}
          </CardTitle>
          <CardDescription className="text-center">
            {translations.enterRecoveryPart}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="part1">{translations.recoveryPart}</Label>
            <div className="relative">
              <Input
                id="part1"
                type={showPart1 ? "text" : "password"}
                placeholder={translations.recoveryPart}
                value={part1}
                onChange={(e) => setPart1(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onMouseDown={() => setShowPart1(true)}
                onMouseUp={() => setShowPart1(false)}
                onMouseLeave={() => setShowPart1(false)}
                onTouchStart={() => setShowPart1(true)}
                onTouchEnd={() => setShowPart1(false)}
                onTouchCancel={() => setShowPart1(false)}
                onPointerDown={() => setShowPart1(true)}
                onPointerUp={() => setShowPart1(false)}
                onPointerCancel={() => setShowPart1(false)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPart1 ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {message && (
            <p className="text-destructive text-sm text-center">{message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            onClick={handleRecoverPassword}
            className="w-full"
            disabled={!username || !part1 || isLoading}
          >
            {isLoading ? (translations.loading) : (translations.recoverPassword)}
          </Button>
          <Button
            variant="outline"
            onClick={handleBack}
            className="w-full"
          >
            {translations.backToLogin}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PartsRecoveryComponent;
