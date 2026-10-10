import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { authFetch, setAccessToken } from '@/shared/auth/session';
import { apiUrl } from '@/shared/api/apiUrl';
import { uploadAttachment } from '@/shared/api/attachments';
import { apiErrorMessage, errorFromResponse } from '@/shared/lib/apiError';
import { useRegisterMutation } from '../api/authApi';

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
  const [register] = useRegisterMutation();

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
      const data = await register({ username: normalizedUsername, display_name: normalizedDisplayName, password }).unwrap();
      setAccessToken(data.access_token);
      setUsername(normalizedUsername);
      // The recovery shares of the temporary recovery flow; a backend without it (redesigned in 1.1) sends
      // none, and there is nothing to save.
      if (data.device_part && data.qr_part) {
        const existingDeviceParts = JSON.parse(localStorage.getItem('device_parts') || '{}');
        existingDeviceParts[normalizedUsername] = data.device_part;
        localStorage.setItem('device_parts', JSON.stringify(existingDeviceParts));
        localStorage.setItem('device_part', data.device_part);
        setQrPart(data.qr_part);
        setShowQr(true);
        setShowProfileSetup(false);
        setMessage(`${translations.registerSuccess} ${translations.saveQrPart}`);
      } else {
        setShowQr(false);
        setShowProfileSetup(true);
        setMessage('');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(apiErrorMessage(error, translations.registerFailed || translations.networkError));
    }
  }, [username, displayName, password, translations, register]);

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
    if (!localStorage.getItem('access_token')) {
      setMessage(translations.registerFailed || 'Registration failed');
      return;
    }
    setIsSavingProfile(true);
    setMessage('');
    let fallback = translations.networkError || 'Something went wrong.';
    try {
      if (profileAvatarFile) {
        // An avatar is an attachment (purpose "avatar") that PUT /me/avatar then makes current.
        fallback = translations.avatarUploadFailed || 'Avatar upload failed.';
        const attachment = await uploadAttachment(profileAvatarFile, 'avatar');
        const avatarResponse = await authFetch(apiUrl('/me/avatar'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachment_id: attachment.id }),
        });
        if (!avatarResponse.ok) throw await errorFromResponse(avatarResponse);
      }
      const normalizedBio = profileBio.trim();
      if (normalizedBio) {
        fallback = translations.bioUpdateFailed || 'Bio update failed.';
        const bioResponse = await authFetch(apiUrl('/me'), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: normalizedBio }),
        });
        if (!bioResponse.ok) throw await errorFromResponse(bioResponse);
      }
      finishRegistration();
    } catch (error) {
      setMessage(apiErrorMessage(error, fallback));
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
