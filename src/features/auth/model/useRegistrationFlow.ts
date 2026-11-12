import { getApiBaseUrl } from '@/shared/api/config';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { setAccessToken } from '@/shared/auth/session';
import {
  normalizeDisplayName, normalizeUsername, registerErrorsFromProblem, validateRegisterField, validateRegisterValues,
  type AccountField, type RegisterFieldError, type RegisterFieldErrors, type RegisterStep,
} from './registerForm';

const BASE_URL = getApiBaseUrl();

interface RegistrationFlowOptions {
  onLoginSuccess: (username: string) => void;
}

export const useRegistrationFlow = ({ onLoginSuccess }: RegistrationFlowOptions) => {
  const [username, setUsernameValue] = useState('');
  const [displayName, setDisplayNameValue] = useState('');
  const [displayNameError, setDisplayNameError] = useState<RegisterFieldError | undefined>();
  const [password, setPasswordValue] = useState('');
  const [passkeyPassword, setPasskeyPassword] = useState('');
  const [message, setMessage] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showPasskeyOffer, setShowPasskeyOffer] = useState(false);
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [avatarCropPreview, setAvatarCropPreview] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<AccountField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<RegisterFieldErrors>({});
  const { translations } = useLanguage();

  useEffect(() => () => {
    if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
  }, [profileAvatarPreview]);

  useEffect(() => () => {
    if (avatarCropPreview) URL.revokeObjectURL(avatarCropPreview);
  }, [avatarCropPreview]);

  const clientErrors = validateRegisterValues({ username, password });
  const fieldErrors: RegisterFieldErrors = {
    username: serverErrors.username ?? (touched.username ? clientErrors.username : undefined),
    password: serverErrors.password ?? (touched.password ? clientErrors.password : undefined),
  };

  const change = (field: AccountField, setter: (value: string) => void) => (value: string) => {
    setter(value);
    setServerErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
  };
  const markTouched = (field: AccountField) => setTouched((previous) => ({ ...previous, [field]: true }));

  const handleRegister = useCallback(async () => {
    setTouched({ username: true, password: true });
    setMessage('');
    if (Object.keys(validateRegisterValues({ username, password })).length > 0) return;
    const normalizedUsername = normalizeUsername(username);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizedUsername, display_name: normalizedUsername, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        if (!data.access_token) throw new Error(translations.registerFailed || 'Registration failed');
        setAccessToken(data.access_token);
        setUsernameValue(normalizedUsername);
        setDisplayNameValue(normalizedUsername);
        localStorage.removeItem('device_part');
        localStorage.removeItem('device_parts');
        setPasskeyPassword(password);
        setPasswordValue('');
        setRecoveryKey(typeof data.recovery_key === 'string' ? data.recovery_key : '');
        setShowQr(Boolean(data.recovery_key));
        setShowProfileSetup(!data.recovery_key);
        return;
      }
      const errors = registerErrorsFromProblem(response.status, data);
      setServerErrors(errors);
      if (Object.keys(errors).length === 0) {
        setMessage(response.status === 429 ? translations.authLayout.errors.tooManyAttempts : translations.registerFailed);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(translations.networkError);
    } finally {
      setIsSubmitting(false);
    }
  }, [username, password, translations]);

  const handleContinue = useCallback(() => {
    setShowQr(false);
    setRecoveryKey('');
    setShowPasskeyOffer(true);
    setMessage('');
  }, []);

  const finishPasskeyOffer = useCallback(() => {
    setPasskeyPassword('');
    setShowPasskeyOffer(false);
    setShowProfileSetup(true);
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
    const nameError = validateRegisterField('displayName', displayName);
    setDisplayNameError(nameError);
    if (nameError) return;
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
      const normalizedName = normalizeDisplayName(displayName);
      const patch = {
        ...(normalizedName !== username ? { display_name: normalizedName } : {}),
        ...(normalizedBio ? { bio: normalizedBio } : {}),
      };
      if (Object.keys(patch).length > 0) {
        const profileResponse = await fetch(`${BASE_URL}/me`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!profileResponse.ok) {
          const data = await profileResponse.json().catch(() => ({}));
          if (registerErrorsFromProblem(profileResponse.status, data).displayName) {
            setDisplayNameError('displayNameLength');
            return;
          }
          throw new Error(data.detail || translations.bioUpdateFailed || 'Profile update failed.');
        }
      }
      finishRegistration();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : translations.networkError || 'Something went wrong.');
    } finally {
      setIsSavingProfile(false);
    }
  }, [displayName, finishRegistration, profileAvatarFile, profileBio, translations, username]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleRegister();
  };

  const step: RegisterStep = showQr ? 'recovery' : showPasskeyOffer ? 'passkey' : showProfileSetup ? 'profile' : 'account';

  return {
    avatarCropFile, avatarCropPreview, cancelAvatarCrop, displayName, fieldErrors,
    finishPasskeyOffer, finishRegistration, handleContinue, handleCroppedAvatar, passkeyPassword,
    handleProfileAvatarChange, handleRegister, handleSaveProfileSetup, handleSubmit,
    isSavingProfile, isSubmitting, markTouched, message, password, profileAvatarFile,
    profileAvatarPreview, profileBio, recoveryKey, removeProfileAvatar,
    setDisplayName: (value: string) => { setDisplayNameValue(value); setDisplayNameError(undefined); },
    setPassword: change('password', setPasswordValue),
    displayNameChanged: normalizeDisplayName(displayName) !== username, displayNameError,
    setProfileBio, setUsername: change('username', setUsernameValue), step, translations, username,
  };
};
