import React, { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import QRCode from 'react-qr-code';
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

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-foreground text-center">
        {translations.register}
      </h2>
      {!showQr ? (
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
            onClick={handleRegister}
            className="w-full"
            disabled={!username || !password}
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
        </>
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
      {message && <p className="text-destructive text-sm mt-2 text-center">{message}</p>}
    </div>
  );
};

export default RegisterComponent;
