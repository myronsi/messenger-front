import { useEffect, useState } from 'react';
import { useDeleteAccountMutation, useUpdateUserBioMutation, useUpdateUserMutation, useUploadAvatarMutation } from '@/features/profile';
import { useLogoutMutation } from '@/features/auth';
import { endSession } from '@/shared/auth/session';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { apiErrorMessage } from '@/shared/lib/apiError';
import type { User } from '@/entities/user';

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

const errorMessage = (error: unknown, fallback: string) => apiErrorMessage(error, fallback);

export const useProfileAccountActions = ({ userData, refetchCurrentUser, onClose, onLogout }: ProfileAccountActionsArgs) => {
  const { translations } = useLanguage();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();
  const [uploadAvatar] = useUploadAvatarMutation();
  const [updateUserBio] = useUpdateUserBioMutation();
  const [updateUser] = useUpdateUserMutation();
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
      await uploadAvatar(croppedAvatarFile).unwrap();
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
      await updateUserBio({ bio: newBio }).unwrap();
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
      await updateUser({ display_name: normalized }).unwrap();
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
    onConfirm: async (password?: string) => {
      if (!password) return;
      try {
        await deleteAccount({ password }).unwrap();
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
