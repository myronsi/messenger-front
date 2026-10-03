import { useEffect, useState } from 'react';
import { useDeleteAccountMutation } from '@/features/profile';
import { useLogoutMutation } from '@/features/auth';
import { authFetch, endSession } from '@/shared/auth/session';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { User } from '@/entities/user';

const BASE_URL = import.meta.env.VITE_BASE_URL;
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
  onConfirm?: () => void;
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

  useEffect(() => {
    setIsVisible(true);
    if (userData) {
      setBio(userData.bio || '');
      setNewBio(userData.bio || '');
      setDisplayName(userData.display_name || userData.username);
      setNewDisplayName(userData.display_name || userData.username);
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
      setModal({ type: 'success', message: 'Avatar updated successfully' });
      if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl);
      setAvatarCropUrl(null);
      setAvatarFile(null);
    } catch (error) {
      setModal({ type: 'error', message: errorMessage(error, 'Failed to update avatar') });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateBio = async () => {
    if (!userData || newBio === bio) return;
    setIsUpdatingBio(true);
    try {
      const response = await authFetch(`${BASE_URL}/auth/me/bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: newBio }),
      });
      if (!response.ok) throw new Error('Failed to update bio');
      setBio(newBio);
      setModal({ type: 'success', message: 'Bio updated successfully' });
    } catch (error) {
      setModal({ type: 'error', message: errorMessage(error, 'Failed to update bio') });
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    const normalized = normalizeDisplayName(newDisplayName);
    if (!userData || normalized === displayName) return;
    if (!isValidDisplayName(newDisplayName)) {
      setModal({ type: 'error', message: 'Display name must be between 3 and 50 characters' });
      return;
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
      setModal({ type: 'success', message: 'Display name updated successfully' });
    } catch (error) {
      setModal({ type: 'error', message: errorMessage(error, 'Failed to update display name') });
    } finally {
      setIsUpdatingDisplayName(false);
    }
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
    onConfirm: async () => {
      try {
        await deleteAccount().unwrap();
        endSession();
        onLogout();
      } catch (error) {
        setModal({ type: 'error', message: errorMessage(error, 'Failed to delete account') });
      }
    },
  });

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  return {
    avatarFile, setAvatarFile, avatarCropUrl, setAvatarCropUrl, isUploading,
    bio, newBio, setNewBio, displayName, newDisplayName, setNewDisplayName,
    isUpdatingBio, isUpdatingDisplayName, isGroupModalOpen, setIsGroupModalOpen,
    isAvatarViewerOpen, setIsAvatarViewerOpen, isVisible, modal, setModal,
    isLoggingOut, isDeletingAccount, handleAvatarUpload, handleUpdateBio,
    handleUpdateDisplayName, handleLogout, handleDeleteAccount, handleClose,
    displayNameChanged: normalizeDisplayName(newDisplayName) !== displayName,
    displayNameInvalid: !!newDisplayName && !isValidDisplayName(newDisplayName),
    bioMaxLength: BIO_MAX_LENGTH,
  };
};
