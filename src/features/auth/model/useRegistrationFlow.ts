import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { setAccessToken } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const normalizeDisplayName = (value: string) => value.trim().replace(/\s+/g, ' ');
const isValidDisplayName = (value: string) => {
  const normalized = normalizeDisplayName(value);
  return normalized.length >= 3 && normalized.length <= 50;
};

interface RegistrationFlowOptions {
  onLoginSuccess: (username: string) => void;
}

export const useRegistrationFlow = ({ onLoginSuccess }: RegistrationFlowOptions) => {
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

  useEffect(() => () => {
    if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
  }, [profileAvatarPreview]);

  useEffect(() => () => {
    if (avatarCropPreview) URL.revokeObjectURL(avatarCropPreview);
  }, [avatarCropPreview]);

  const handleRegister = useCallback(async () => {
    const normalizedUsername = username.toLowerCase();
    if (normalizedUsername.length < 3) {
      setMessage(translations.usernameTooShort);
      return;
    }
    if (!/^[a-z0-9_]{3,32}$/.test(normalizedUsername)) {
      setMessage(translations.usernameInvalid);
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
        body: JSON.stringify({ username: normalizedUsername, display_name: normalizedDisplayName, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (!data.access_token) throw new Error(translations.registerFailed || 'Registration failed');
        setAccessToken(data.access_token);
        const existingDeviceParts = JSON.parse(localStorage.getItem('device_parts') || '{}');
        existingDeviceParts[normalizedUsername] = data.device_part;
        setUsername(normalizedUsername);
        localStorage.setItem('device_parts', JSON.stringify(existingDeviceParts));
        localStorage.setItem('device_part', data.device_part);
        setQrPart(data.qr_part);
        setShowQr(true);
        setShowProfileSetup(false);
        setMessage(`${translations.registerSuccess} ${translations.saveQrPart}`);
      } else {
        setMessage(data.detail || translations.registerFailed);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(translations.networkError);
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

  const handleProfileAvatarChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : translations.networkError || 'Something went wrong.');
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
      canvas.width = 220;
      canvas.height = 220;
      const context = canvas.getContext('2d');
      if (!context) {
        setMessage(translations.qrDownloadError);
        return;
      }
      const image = new Image();
      image.onload = () => {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 10, 10, 200, 200);
        const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `recovery-qr-${username}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };
      image.onerror = () => {
        console.error('Failed to load SVG image');
        setMessage(translations.qrDownloadError);
      };
      image.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    } catch (error) {
      console.error('Error downloading QR code:', error);
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleRegister();
  };

  const inputsFilled = Boolean(username && normalizeDisplayName(displayName) && password);

  return {
    avatarCropFile, avatarCropPreview, cancelAvatarCrop, copyQrPart, displayName,
    downloadQR, finishRegistration, handleContinue, handleCroppedAvatar,
    handleProfileAvatarChange, handleRegister, handleSaveProfileSetup, handleSubmit,
    inputsFilled, isDisplayNameValid: isValidDisplayName(displayName),
    isSavingProfile, message, password, profileAvatarFile,
    profileAvatarPreview, profileBio, qrPart, removeProfileAvatar, setDisplayName,
    setPassword, setProfileBio, setShowPassword, setUsername, showPassword,
    showProfileSetup, showQr, translations, username,
  };
};
