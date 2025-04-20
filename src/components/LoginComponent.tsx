import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { QrReader } from 'react-qr-reader';
import jsQR from 'jsqr';

interface LoginComponentProps {
  onLoginSuccess: (username: string) => void;
  onRegisterClick: () => void;
}

const BASE_URL = "http://192.168.178.29:8000";

const LoginComponent: React.FC<LoginComponentProps> = ({ onLoginSuccess, onRegisterClick }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [part1, setPart1] = useState(localStorage.getItem('device_part') || '');
  const [part2, setPart2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [qrInputMethod, setQrInputMethod] = useState<'manual' | 'scan' | 'upload'>('manual');
  const [qrScanActive, setQrScanActive] = useState(false);
  const { translations } = useLanguage();

  const validatePartFormat = (part: string): boolean => {
    return /^[0-9a-f]+-[1-3]-[0-9a-f]+$/.test(part.trim());
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setMessage(translations.missingFields);
      return;
    }
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
        setMessage(data.detail || translations.loginFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Login error:', err);
    }
  };

  const handleRecoverPassword = async () => {
    if (!username || !part1 || !part2) {
      setMessage(translations.missingFields);
      return;
    }
    if (!validatePartFormat(part1) || !validatePartFormat(part2)) {
      setMessage(translations.invalidPartsFormat);
      return;
    }
    console.log('Sending recovery request:', { username, part1, part2 });
    try {
      const response = await fetch(`${BASE_URL}/auth/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, part1: part1.trim(), part2: part2.trim() }),
      });
      const data = await response.json();
      console.log('Recover response:', data);
      if (response.ok) {
        setRecoveryToken(data.recovery_token);
        setIsRecovering(false);
        setIsResetting(true);
        setMessage(translations.recoverySuccess);
      } else {
        setMessage(data.detail || translations.recoveryFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Recovery error:', err);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setMessage(translations.missingFields);
      return;
    }
    if (newPassword.length < 8) {
      setMessage(translations.passwordTooShort);
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recovery_token: recoveryToken, new_password: newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(translations.resetPasswordSuccess);
        setIsResetting(false);
        setRecoveryToken('');
        setNewPassword('');
        setUsername('');
        setPassword('');
      } else {
        setMessage(data.detail || translations.resetPasswordFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Reset password error:', err);
    }
  };

  const handleQrScan = (data: string | null) => {
    if (data) {
      const cleanedData = data.trim();
      if (validatePartFormat(cleanedData)) {
        setPart2(cleanedData);
        setQrScanActive(false);
        setMessage(translations.qrScanned);
        console.log('Scanned QR code:', cleanedData);
      } else {
        setMessage(translations.invalidPartsFormat);
      }
    }
  };

  const handleQrError = (err: any) => {
    console.error('QR scan error:', err);
    setMessage(translations.qrScanError);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage(translations.fileTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            const cleanedData = code.data.trim();
            if (validatePartFormat(cleanedData)) {
              setPart2(cleanedData);
              setMessage(translations.qrUploaded);
              console.log('Decoded QR code from image:', cleanedData);
            } else {
              setMessage(translations.invalidPartsFormat);
            }
          } else {
            setMessage(translations.qrDecodeError);
          }
        } else {
          setMessage(translations.qrDecodeError);
        }
      };
      img.onerror = () => {
        setMessage(translations.qrDecodeError);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setMessage(translations.qrDecodeError);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-foreground text-center">
        {isRecovering ? translations.recoverPassword : isResetting ? translations.resetPassword : translations.login}
      </h2>
      {!isRecovering && !isResetting ? (
        <>
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
            disabled={!username || !password}
          >
            {translations.login}
          </Button>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsRecovering(true)}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {translations.forgotPassword}
            </Button>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">{translations.noAccount}</p>
              <Button
                variant="outline"
                onClick={onRegisterClick}
                className="w-full"
              >
                {translations.register}
              </Button>
            </div>
          </div>
        </>
      ) : isRecovering ? (
        <>
          <input
            type="text"
            placeholder={translations.username}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            placeholder={translations.part1}
            value={part1}
            onChange={(e) => setPart1(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="space-y-2">
            <div className="flex gap-2 justify-center">
              <Button
                variant={qrInputMethod === 'manual' ? 'default' : 'outline'}
                onClick={() => {
                  setQrInputMethod('manual');
                  setQrScanActive(false);
                }}
              >
                {translations.manualInput}
              </Button>
              <Button
                variant={qrInputMethod === 'scan' ? 'default' : 'outline'}
                onClick={() => {
                  setQrInputMethod('scan');
                  setQrScanActive(true);
                }}
              >
                {translations.scanQr}
              </Button>
              <Button
                variant={qrInputMethod === 'upload' ? 'default' : 'outline'}
                onClick={() => {
                  setQrInputMethod('upload');
                  setQrScanActive(false);
                }}
              >
                {translations.uploadQr}
              </Button>
            </div>
            {qrInputMethod === 'manual' && (
              <input
                type="text"
                placeholder={translations.part2}
                value={part2}
                onChange={(e) => setPart2(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            {qrInputMethod === 'scan' && qrScanActive && (
              <div className="flex justify-center">
                <QrReader
                  delay={300}
                  onError={handleQrError}
                  onScan={handleQrScan}
                  style={{ width: '100%', maxWidth: '300px' }}
                  className="qr-reader"
                />
              </div>
            )}
            {qrInputMethod === 'upload' && (
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md"
              />
            )}
            {(qrInputMethod === 'scan' || qrInputMethod === 'upload') && part2 && (
              <p className="text-sm text-muted-foreground text-center">
                {translations.qrDetected}: {part2.substring(0, 20)}...
              </p>
            )}
          </div>
          <Button
            onClick={handleRecoverPassword}
            className="w-full"
            disabled={!username || !part1 || !part2}
          >
            {translations.recoverPassword}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsRecovering(false);
              setQrScanActive(false);
              setQrInputMethod('manual');
              setPart1(localStorage.getItem('device_part') || '');
              setPart2('');
              setMessage('');
            }}
            className="w-full mt-2"
          >
            {translations.backToLogin}
          </Button>
        </>
      ) : (
        <>
          <input
            type="password"
            placeholder={translations.newPassword}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={handleResetPassword}
            className="w-full"
            disabled={!newPassword}
          >
            {translations.resetPassword}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsResetting(false);
              setRecoveryToken('');
              setNewPassword('');
              setMessage('');
            }}
            className="w-full mt-2"
          >
            {translations.backToLogin}
          </Button>
        </>
      )}
      {message && <p className="text-destructive text-sm mt-2 text-center">{message}</p>}
    </div>
  );
};

export default LoginComponent;
