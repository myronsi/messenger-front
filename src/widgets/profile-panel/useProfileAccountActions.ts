import { getApiBaseUrl } from '@/shared/api/config';
import { useEffect, useRef, useState } from 'react';
import { useDeleteAccountMutation } from '@/features/profile';
import { WINDOW_MOTION_MS } from '@/shared/ui/windowMotion';
import { useLogoutMutation } from '@/features/auth';
import { authFetch, endSession } from '@/shared/auth/session';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useDeleteMyAvatarMutation, userApi, type User } from '@/entities/user';
import { useAppDispatch } from '@/shared/hooks/redux';
import type { EntityId } from '@/shared/api/entityId';

const BASE_URL = getApiBaseUrl();
const BIO_MAX_LENGTH = 500;
const normalizeDisplayName = (value: string) => value.trim().replace(/\s+/g, ' ');
const isValidDisplayName = (value: string) => {
  const normalized = normalizeDisplayName(value);
  return normalized.length >= 3 && normalized.length <= 50;
};

export interface ProfileModalState {
  type: 'logout' | 'deleteAccount' | 'blockUser' | 'success' | 'error';
  message: string;
  consequences?: string[];
  onConfirm?: (password?: string) => void;
}

interface ProfileAccountActionsArgs {
  userData?: User;
  refetchCurrentUser: () => Promise<unknown>;
  onClose: () => void;
  onLogout: () => void;
}

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string') {
      return data.detail;
    }
  }
  return fallback;
};

export const useProfileAccountActions = ({ userData, refetchCurrentUser, onClose, onLogout }: ProfileAccountActionsArgs) => {
  const { translations } = useLanguage();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();
  const [deleteMyAvatar] = useDeleteMyAvatarMutation();
  const dispatch = useAppDispatch();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarCropUrl, setAvatarCropUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bio, setBio] = useState('');
  const [newBio, setNewBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [modal, setModal] = useState<ProfileModalState | null>(null);

  const savedRef = useRef({ bio: '', displayName: '' });

  useEffect(() => {
    setIsVisible(true);
    if (userData) {
      const previous = savedRef.current;
      const saved = { bio: userData.bio || '', displayName: userData.display_name || userData.username };
      savedRef.current = saved;
      setBio(saved.bio);
      setNewBio((draft) => (draft === previous.bio ? saved.bio : draft));
      setDisplayName(saved.displayName);
      setNewDisplayName((draft) => (draft === previous.displayName ? saved.displayName : draft));
    }
  }, [userData]);

  const handleAvatarUpload = async (croppedAvatarFile: File) => {
    if (!userData) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedAvatarFile);
      const response = await authFetch(`${BASE_URL}/auth/me/avatar`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to upload avatar');
      await refetchCurrentUser();
      dispatch(userApi.util.invalidateTags([{ type: 'Avatar', id: `${userData.username}-history` }]));
      if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl);
      setAvatarCropUrl(null);
      setAvatarFile(null);
    } catch (error) {
      setModal({ type: 'error', message: errorMessage(error, 'Failed to update avatar') });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarDelete = async (id: EntityId) => {
    if (!userData) return;
    await deleteMyAvatar({ id, username: userData.username }).unwrap();
    await refetchCurrentUser();
  };

  const saveBio = async (quiet: boolean) => {
    if (!userData || newBio === bio) return true;
    setIsUpdatingBio(true);
    try {
      const response = await authFetch(`${BASE_URL}/auth/me/bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: newBio }),
      });
      if (!response.ok) throw new Error('Failed to update bio');
      setBio(newBio);
      if (!quiet) setModal({ type: 'success', message: 'Bio updated successfully' });
      return true;
    } catch (error) {
      setModal({ type: 'error', message: errorMessage(error, 'Failed to update bio') });
      return false;
    } finally {
      setIsUpdatingBio(false);
    }
  };
  const handleUpdateBio = () => saveBio(false);

  const saveDisplayName = async (quiet: boolean) => {
    const normalized = normalizeDisplayName(newDisplayName);
    if (!userData || normalized === displayName) return true;
    if (!isValidDisplayName(newDisplayName)) {
      setModal({ type: 'error', message: 'Display name must be between 3 and 50 characters' });
      return false;
    }
    setIsUpdatingDisplayName(true);
    try {
      const response = await authFetch(`${BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: normalized }),
      });
      if (!response.ok) throw new Error('Failed to update display name');
      setDisplayName(normalized);
      setNewDisplayName(normalized);
      if (!quiet) setModal({ type: 'success', message: 'Display name updated successfully' });
      return true;
    } catch (error) {
      setModal({ type: 'error', message: errorMessage(error, 'Failed to update display name') });
      return false;
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };
  const handleUpdateDisplayName = () => saveDisplayName(false);

  const handleSavePersonalInfo = async () => (await saveDisplayName(true)) && (await saveBio(true));
  const discardPersonalInfo = () => {
    setNewDisplayName(displayName);
    setNewBio(bio);
  };

  const handleLogout = () => setModal({
    type: 'logout',
    message: translations.logoutConfirm,
    onConfirm: async () => {
      try {
        await logout().unwrap();
      } catch {
        // Local logout remains available if the server request fails.
      }
      endSession();
      onLogout();
    },
  });

  const handleDeleteAccount = () => setModal({
    type: 'deleteAccount',
    message: translations.deleteAccountConfirm,
    onConfirm: async (password) => {
      try {
        await deleteAccount(password || '').unwrap();
        endSession();
        onLogout();
      } catch (error) {
        setModal({ type: 'error', message: errorMessage(error, 'Failed to delete account') });
      }
    },
  });

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, WINDOW_MOTION_MS);
  };

  return {
    avatarFile, setAvatarFile, avatarCropUrl, setAvatarCropUrl, isUploading,
    bio, newBio, setNewBio, displayName, newDisplayName, setNewDisplayName,
    isUpdatingBio, isUpdatingDisplayName, isGroupModalOpen, setIsGroupModalOpen,
    isAvatarViewerOpen, setIsAvatarViewerOpen, isVisible, modal, setModal,
    isLoggingOut, isDeletingAccount, handleAvatarUpload, handleAvatarDelete, handleUpdateBio,
    handleUpdateDisplayName, handleSavePersonalInfo, discardPersonalInfo, handleLogout, handleDeleteAccount, handleClose,
    displayNameChanged: normalizeDisplayName(newDisplayName) !== displayName,
    displayNameInvalid: !!newDisplayName && !isValidDisplayName(newDisplayName),
    bioMaxLength: BIO_MAX_LENGTH,
  };
};
