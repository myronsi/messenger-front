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
import { Textarea } from '@/shared/ui/textarea';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import AvatarCropModal from '@/features/profiles/AvatarCropModal';
import { Camera, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { setAccessToken } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const normalizeDisplayName = (value: string) => value.trim().replace(/\s+/g, ' ');
const isValidDisplayName = (value: string) => {
  const normalized = normalizeDisplayName(value);
  return normalized.length >= 3 && normalized.length <= 50;
};

interface RegisterComponentProps {
  onLoginSuccess: (username: string) => void;
  onBackToLogin: () => void;
}

const RegisterComponent: React.FC<RegisterComponentProps> = ({ onLoginSuccess, onBackToLogin }) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [qrPart, setQrPart] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [avatarCropPreview, setAvatarCropPreview] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { translations } = useLanguage();

  useEffect(() => {
    if (showQr && qrPart) {
      console.log('Rendering QRCode with qrPart:', qrPart);
    }
  }, [showQr, qrPart]);

  useEffect(() => {
    return () => {
      if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
    };
  }, [profileAvatarPreview]);

  useEffect(() => {
    return () => {
      if (avatarCropPreview) URL.revokeObjectURL(avatarCropPreview);
    };
  }, [avatarCropPreview]);

  const handleRegister = useCallback(async () => {
    if (!username || username.length < 3) {
      setMessage(translations.usernameTooShort);
      return;
    }
    const normalizedDisplayName = normalizeDisplayName(displayName);
    if (!isValidDisplayName(displayName)) {
      setMessage('Display name must be between 3 and 50 characters');
      return;
    }
    if (!password || password.length < 8) {
      setMessage(translations.passwordTooShort);
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, display_name: normalizedDisplayName, password }),
      });
      const data = await response.json();
      console.log('Server response:', data);
      if (response.ok) {
        if (!data.access_token) throw new Error(translations.registerFailed || 'Registration failed');
        setAccessToken(data.access_token);
        
        const existingDeviceParts = JSON.parse(localStorage.getItem('device_parts') || '{}');
        existingDeviceParts[username] = data.device_part;
        localStorage.setItem('device_parts', JSON.stringify(existingDeviceParts));
        
        localStorage.setItem('device_part', data.device_part);
        
        setQrPart(data.qr_part);
        setShowQr(true);
        setShowProfileSetup(false);
        setMessage(translations.registerSuccess + ' ' + translations.saveQrPart);
      } else {
        setMessage(data.detail || translations.registerFailed);
      }
    } catch (err) {
      setMessage(translations.networkError);
      console.error('Registration error:', err);
    }
  }, [username, displayName, password, translations]);

  const handleContinue = useCallback(() => {
    setShowQr(false);
    setShowProfileSetup(true);
    setMessage('');
  }, []);

  const finishRegistration = useCallback(() => {
    setShowProfileSetup(false);
    onLoginSuccess(username);
  }, [username, onLoginSuccess]);

  const handleProfileAvatarChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage(translations.invalidFileType || 'Please choose an image file.');
      return;
    }
    if (avatarCropPreview) URL.revokeObjectURL(avatarCropPreview);
    setAvatarCropFile(file);
    setAvatarCropPreview(URL.createObjectURL(file));
    setMessage('');
  }, [avatarCropPreview, translations]);

  const handleCroppedAvatar = useCallback((croppedFile: File) => {
    if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
    if (avatarCropPreview) URL.revokeObjectURL(avatarCropPreview);
    setProfileAvatarFile(croppedFile);
    setProfileAvatarPreview(URL.createObjectURL(croppedFile));
    setAvatarCropFile(null);
    setAvatarCropPreview('');
  }, [avatarCropPreview, profileAvatarPreview]);

  const cancelAvatarCrop = useCallback(() => {
    if (avatarCropPreview) URL.revokeObjectURL(avatarCropPreview);
    setAvatarCropFile(null);
    setAvatarCropPreview('');
  }, [avatarCropPreview]);

  const removeProfileAvatar = useCallback(() => {
    if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
    setProfileAvatarPreview('');
    setProfileAvatarFile(null);
  }, [profileAvatarPreview]);

  const handleSaveProfileSetup = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setMessage(translations.registerFailed || 'Registration failed');
      return;
    }

    setIsSavingProfile(true);
    setMessage('');
    try {
      if (profileAvatarFile) {
        const formData = new FormData();
        formData.append('file', profileAvatarFile);
        const avatarResponse = await fetch(`${BASE_URL}/auth/me/avatar`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!avatarResponse.ok) {
          const data = await avatarResponse.json().catch(() => ({}));
          throw new Error(data.detail || translations.avatarUploadFailed || 'Avatar upload failed.');
        }
      }

      const normalizedBio = profileBio.trim();
      if (normalizedBio) {
        const bioResponse = await fetch(`${BASE_URL}/auth/me/bio`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bio: normalizedBio }),
        });
        if (!bioResponse.ok) {
          const data = await bioResponse.json().catch(() => ({}));
          throw new Error(data.detail || translations.bioUpdateFailed || 'Bio update failed.');
        }
      }

      finishRegistration();
    } catch (error: any) {
      setMessage(error?.message || translations.networkError || 'Something went wrong.');
    } finally {
      setIsSavingProfile(false);
    }
  }, [finishRegistration, profileAvatarFile, profileBio, translations]);

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

  const inputsFilled = Boolean(username && normalizeDisplayName(displayName) && password);

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
        {!showQr && !showProfileSetup ? (
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
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Display Name (3-50 characters)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                required
              />
              {displayName && !isValidDisplayName(displayName) && (
                <p className="text-sm text-destructive">Display name must be between 3 and 50 characters</p>
              )}
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
        ) : showQr ? (
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
        ) : (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {translations.setupProfile || 'Set up your profile'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {translations.setupProfileDescription || 'Add an avatar and bio now, or skip this step.'}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src={profileAvatarPreview || DEFAULT_AVATAR}
                  alt="Profile avatar preview"
                  className="h-24 w-24 rounded-full border border-gray-200 object-cover"
                />
                {profileAvatarFile && (
                  <button
                    type="button"
                    onClick={removeProfileAvatar}
                    disabled={isSavingProfile}
                    className="absolute -right-1 -top-1 rounded-full bg-gray-900 p-1 text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
                    aria-label="Remove selected avatar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Camera className="h-4 w-4" />
                {profileAvatarFile ? (translations.changeAvatar || 'Change avatar') : (translations.addAvatar || 'Add avatar')}
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileAvatarChange}
                  disabled={isSavingProfile}
                />
              </Label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profileBio">{translations.bio || 'Bio'}</Label>
              <Textarea
                id="profileBio"
                value={profileBio}
                onChange={(event) => setProfileBio(event.target.value)}
                maxLength={500}
                disabled={isSavingProfile}
                placeholder={translations.bioPlaceholder || 'Write a short bio'}
              />
              <p className="text-right text-xs text-muted-foreground">{profileBio.length}/500</p>
            </div>

            <div className="grid gap-2">
              <Button
                onClick={handleSaveProfileSetup}
                disabled={isSavingProfile}
                className="w-full"
              >
                {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {translations.finish || 'Finish'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={finishRegistration}
                disabled={isSavingProfile}
                className="w-full"
              >
                {translations.skipForNow || 'Skip for now'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className='flex-col gap-2'>
        {!showQr && !showProfileSetup && inputsFilled ? (
          <Button type="submit" onClick={handleRegister} className="w-full">
            {translations.register}
          </Button>
        ) : !showQr && !showProfileSetup ? (
          <div className="w-full">
            <p className="text-sm text-muted-foreground text-center mb-2">{translations.alreadyHaveAccount}</p>
            <Button variant="outline" onClick={onBackToLogin} className="w-full">
              {translations.backToLogin}
            </Button>
          </div>
        ) : null}

        {message && <p className="text-destructive text-sm mt-2 text-center">{message}</p>}
      </CardFooter>

      {avatarCropFile && avatarCropPreview && (
        <AvatarCropModal
          file={avatarCropFile}
          imageUrl={avatarCropPreview}
          isUploading={isSavingProfile}
          onCancel={cancelAvatarCrop}
          onConfirm={handleCroppedAvatar}
        />
      )}
    </Card>
  );
};

export default RegisterComponent;
