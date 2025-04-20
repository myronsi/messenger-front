import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import QRCode from 'react-qr-code';

interface RegisterComponentProps {
  onLoginSuccess: (username: string) => void;
  onBackToLogin: () => void;
}

const BASE_URL = "http://192.168.178.29:8000";

const RegisterComponent: React.FC<RegisterComponentProps> = ({ onLoginSuccess, onBackToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [qrPart, setQrPart] = useState('');
  const [showQr, setShowQr] = useState(false);
  const { translations } = useLanguage();

  const handleRegister = async () => {
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
        console.log('qrPart set to:', data.qr_part);
        setShowQr(true); // Показываем QR-код
        setMessage(translations.registerSuccess + ' ' + translations.saveQrPart);
      } else {
        setMessage(data.detail);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Registration error:', err);
    }
  };

  const handleContinue = () => {
    setShowQr(false);
    onLoginSuccess(username); // Перенаправляем только после явного действия
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code') as SVGSVGElement;
    if (!svg) {
      console.error('SVG element not found');
      setMessage('Failed to download QR code');
      return;
    }

    // Сериализуем SVG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Устанавливаем размеры canvas
    canvas.width = 200 + 20;
    canvas.height = 200 + 20;

    img.onload = () => {
      ctx!.fillStyle = '#ffffff';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 10, 10, 200, 200);
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
      setMessage('Failed to download QR code');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

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
            {console.log('Rendering QRCode with qrPart:', qrPart)}
            <QRCode
              id="qr-code"
              value={qrPart}
              size={200}
              level="H"
            />
          </div>
          <Button
            onClick={downloadQR}
            className="mt-2"
            variant="outline"
          >
            {translations.downloadQr}
          </Button>
          <Button
            onClick={handleContinue}
            className="mt-2 w-full"
          >
            {translations.continue}
          </Button>
        </div>
      )}
      {message && <p className="text-destructive text-sm mt-2">{message}</p>}
    </div>
  );
};

export default RegisterComponent;
