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

interface PasswordResetComponentProps {
  onBackToLogin: () => void;
}

const PasswordResetComponent: React.FC<PasswordResetComponentProps> = ({ onBackToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;
  const { translations } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem('recovery_token');

    if (!token) {
      navigate('/recover-username');
      return;
    }

    setRecoveryToken(token);
  }, [navigate]);

  const handleResetPassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      setMessage(translations.missingFields);
      return;
    }
    if (newPassword.length < 3) {
      setMessage(translations.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(translations.passwordsDoNotMatch);
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recovery_token: recoveryToken, new_password: newPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(translations.resetPasswordSuccess);
        
        sessionStorage.removeItem('recovery_username');
        sessionStorage.removeItem('recovery_cloud_part');
        sessionStorage.removeItem('recovery_device_part');
        sessionStorage.removeItem('recovery_token');
        
        setTimeout(() => {
          setNewPassword('');
          setConfirmPassword('');
          setMessage('');
          onBackToLogin();
        }, 2000);
      } else {
        setMessage(data.detail || translations.resetPasswordFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [newPassword, confirmPassword, recoveryToken, translations, onBackToLogin]);

  const handleBack = () => {
    navigate('/recover-parts');
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-center">
            {translations.resetPassword}
          </CardTitle>
          <CardDescription className="text-center">
            {translations.enterYourNewPassword}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{translations.newPassword}</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder={translations.newPassword}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onMouseDown={() => setShowNewPassword(true)}
                onMouseUp={() => setShowNewPassword(false)}
                onMouseLeave={() => setShowNewPassword(false)}
                onTouchStart={() => setShowNewPassword(true)}
                onTouchEnd={() => setShowNewPassword(false)}
                onTouchCancel={() => setShowNewPassword(false)}
                onPointerDown={() => setShowNewPassword(true)}
                onPointerUp={() => setShowNewPassword(false)}
                onPointerCancel={() => setShowNewPassword(false)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{translations.confirmPassword}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder={translations.confirmPassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                className={`pr-10 ${passwordsMatch ? 'ring-2 ring-green-500' : passwordsMismatch ? 'ring-2 ring-destructive' : ''}`}
                aria-invalid={passwordsMismatch}
              />
              <button
                type="button"
                onMouseDown={() => setShowConfirmPassword(true)}
                onMouseUp={() => setShowConfirmPassword(false)}
                onMouseLeave={() => setShowConfirmPassword(false)}
                onTouchStart={() => setShowConfirmPassword(true)}
                onTouchEnd={() => setShowConfirmPassword(false)}
                onTouchCancel={() => setShowConfirmPassword(false)}
                onPointerDown={() => setShowConfirmPassword(true)}
                onPointerUp={() => setShowConfirmPassword(false)}
                onPointerCancel={() => setShowConfirmPassword(false)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>

            { (passwordsMatch || passwordsMismatch) && (
              <p className={`text-sm mt-1 ${passwordsMatch ? 'text-green-500' : 'text-destructive'}`}>
                {passwordsMatch ? translations.passwordsMatch : translations.passwordsDoNotMatch}
              </p>
            ) }
          </div>
          {message && (
            <p className={`text-sm text-center ${
              message === (translations.resetPasswordSuccess)
                ? 'text-green-500'
                : 'text-destructive'
            }`}>
              {message}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            onClick={handleResetPassword}
            className="w-full"
            disabled={!newPassword || !confirmPassword || isLoading}
          >
            {isLoading ? (translations.loading) : (translations.resetPassword)}
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

export default PasswordResetComponent;
