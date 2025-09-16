import React, { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import QRCode from 'react-qr-code';
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

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface RegisterComponentProps {
  onLoginSuccess: (username: string) => void;
  onBackToLogin: () => void;
}

const RegisterComponent: React.FC<RegisterComponentProps> = ({ onLoginSuccess, onBackToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [qrPart, setQrPart] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { translations } = useLanguage();

  useEffect(() => {
    if (showQr && qrPart) {
      console.log('Rendering QRCode with qrPart:', qrPart);
    }
  }, [showQr, qrPart]);

  const handleRegister = useCallback(async () => {
    if (!username || username.length < 3) {
      setMessage(translations.usernameTooShort);
      return;
    }
    if (!password || password.length < 3) {
      setMessage(translations.passwordTooShort);
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      console.log('Server response:', data);
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        
        const existingDeviceParts = JSON.parse(localStorage.getItem('device_parts') || '{}');
        existingDeviceParts[username] = data.device_part;
        localStorage.setItem('device_parts', JSON.stringify(existingDeviceParts));
        
        localStorage.setItem('device_part', data.device_part);
        
        setQrPart(data.qr_part);
        setShowQr(true);
        setMessage(translations.registerSuccess + ' ' + translations.saveQrPart);
      } else {
        setMessage(data.detail || translations.registerFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Registration error:', err);
    }
  }, [username, password, translations]);

  const handleContinue = useCallback(() => {
    setShowQr(false);
    onLoginSuccess(username);
  }, [username, onLoginSuccess]);

  const downloadQR = useCallback(() => {
    const svg = document.getElementById('qr-code');
    if (!(svg instanceof SVGSVGElement)) {
      console.error('QR code SVG element not found or invalid');
      setMessage(translations.qrDownloadError);
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      canvas.width = 200 + 20;
      canvas.height = 200 + 20;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setMessage(translations.qrDownloadError);
        return;
      }
      const img = new Image();

      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 10, 10, 200, 200);
        const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `recovery-qr-${username}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };

      img.onerror = () => {
        console.error('Failed to load SVG image');
        setMessage(translations.qrDownloadError);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (err) {
      console.error('Error downloading QR code:', err);
      setMessage(translations.qrDownloadError);
    }
  }, [username, translations]);

  const copyQrPart = useCallback(() => {
    navigator.clipboard.writeText(qrPart).then(() => {
      setMessage(translations.qrPartCopied);
      setTimeout(() => setMessage(''), 3000);
    }).catch(() => {
      setMessage(translations.qrPartCopyFailed);
    });
  }, [qrPart, translations]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRegister();
  };

  const inputsFilled = Boolean(username && password);

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{translations.register}</CardTitle>
            <CardDescription className='pt-2'>{translations.createNewAccount}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!showQr ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="username">{translations.username}</Label>
              <Input
                id="username"
                type="text"
                placeholder={translations.username}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">{translations.password}</Label>
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
          </form>
        ) : (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">{translations.saveQrPart}</p>
            <div
              className="flex justify-center mt-2 bg-white p-4 border border-gray-200"
              style={{ width: '240px', height: '240px', margin: '0 auto' }}
            >
              <QRCode
                id="qr-code"
                value={qrPart}
                size={200}
                level="H"
              />
            </div>
            <div className="space-y-2 mt-2">
              <Button
                onClick={downloadQR}
                variant="outline"
                className="w-full"
              >
                {translations.downloadQr}
              </Button>
              <Button
                onClick={copyQrPart}
                variant="outline"
                className="w-full"
              >
                {translations.copyQrPart}
              </Button>
              <Button
                onClick={handleContinue}
                className="w-full"
              >
                {translations.continue}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className='flex-col gap-2'>
        {inputsFilled ? (
          <Button type="submit" onClick={handleRegister} className="w-full">
            {translations.register}
          </Button>
        ) : (
          <div className="w-full">
            <p className="text-sm text-muted-foreground text-center mb-2">{translations.alreadyHaveAccount}</p>
            <Button variant="outline" onClick={onBackToLogin} className="w-full">
              {translations.backToLogin}
            </Button>
          </div>
        )}

        {message && <p className="text-destructive text-sm mt-2 text-center">{message}</p>}
      </CardFooter>
    </Card>
  );
};

export default RegisterComponent;
