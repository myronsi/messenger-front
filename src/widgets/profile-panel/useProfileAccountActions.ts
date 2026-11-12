import { getApiBaseUrl } from '@/shared/api/config';
import { useEffect, useRef, useState } from 'react';
import { useDeleteAccountMutation, useUpdateUserMutation } from '@/features/profile';
import { WINDOW_MOTION_MS } from '@/shared/ui/windowMotion';
import { useLogoutMutation } from '@/features/auth';
import { authFetch, endSession, getAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { countUnsentMessages } from '@/shared/lib/unsentMessages';
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
  const [updateUser, { isLoading: isSavingPersonalInfo }] = useUpdateUserMutation();
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

  const handleSavePersonalInfo = async () => {
    if (!userData || isSavingPersonalInfo) return false;
    const normalized = normalizeDisplayName(newDisplayName);
    if (normalized !== displayName && !isValidDisplayName(normalized)) return false;
    if (normalized === displayName && newBio === bio) return true;

    try {
      const saved = await updateUser({
        id: userData.id,
        ...(normalized !== displayName ? { display_name: normalized } : {}),
        ...(newBio !== bio ? { bio: newBio } : {}),
      }).unwrap();
      const savedName = saved.display_name || saved.username;
      const savedBio = saved.bio || '';
      savedRef.current = { displayName: savedName, bio: savedBio };
      setDisplayName(savedName);
      setBio(savedBio);
      setNewDisplayName(draft => draft === newDisplayName ? savedName : draft);
      setNewBio(draft => draft === newBio ? savedBio : draft);
      return true;
    } catch (error) {
      setModal({ type: 'error', message: errorMessage(error, translations.profileSaveFailed) });
      return false;
    }
  };
  const discardPersonalInfo = () => {
    setNewDisplayName(displayName);
    setNewBio(bio);
  };

  const handleLogout = () => {
    const unsent = countUnsentMessages(getTokenSubject(getAccessToken()));
    setModal({
      type: 'logout',
      message: translations.logoutConfirm,
      consequences: unsent ? [translations.logoutUnsentMessages.replace('{count}', String(unsent))] : undefined,
      onConfirm: async () => {
        await logout().unwrap().catch(() => undefined);
        endSession();
        onLogout();
      },
    });
  };

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
    isSavingPersonalInfo, isGroupModalOpen, setIsGroupModalOpen,
    isAvatarViewerOpen, setIsAvatarViewerOpen, isVisible, modal, setModal,
    isLoggingOut, isDeletingAccount, handleAvatarUpload, handleAvatarDelete,
    handleSavePersonalInfo, discardPersonalInfo, handleLogout, handleDeleteAccount, handleClose,
    displayNameChanged: normalizeDisplayName(newDisplayName) !== displayName,
    displayNameInvalid: normalizeDisplayName(newDisplayName) !== displayName && !isValidDisplayName(newDisplayName),
    bioMaxLength: BIO_MAX_LENGTH,
  };
};
