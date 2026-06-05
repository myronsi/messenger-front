import React, { useState, useEffect, forwardRef, useRef } from 'react';
import AvatarCropModal from './ui/AvatarCropModal';
import AvatarHistoryViewer from './ui/AvatarHistoryViewer';
import SecuritySettingsDialog from './ui/SecuritySettingsDialog';
import { Bell, Camera, Globe, Image, Loader2, LogOut, Shield, Smartphone, Trash, UserRound, Users, X } from 'lucide-react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import GroupCreateModal from '@/features/groups/ui/GroupCreateModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { formatDate } from '@/shared/utils/dateFormatters';
import { 
  PrivacySettings,
  useGetCurrentUserQuery, 
  useGetPrivacySettingsQuery,
  useUpdatePrivacySettingsMutation,
  useGetBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useUpdateUserMutation, 
  useLogoutMutation,
  useDeleteAccountMutation
} from '@/app/api/messengerApi';
import { clearAuthTokens } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const normalizeDisplayName = (value: string) => value.trim().replace(/\s+/g, ' ');
const isValidDisplayName = (value: string) => {
  const normalized = normalizeDisplayName(value);
  return normalized.length >= 3 && normalized.length <= 50;
};

type PrivacySettingKey = keyof PrivacySettings;
const visibilityOptions = ['everyone', 'shared_chats', 'nobody'] as const;
const searchOptions = ['everyone', 'nobody'] as const;

interface ProfileComponentRTKProps {
  username: string;
  onClose: () => void;
  onLogout: () => void;
}

const ProfileComponentRTK = forwardRef<HTMLDivElement, ProfileComponentRTKProps>(({ 
  username, 
  onClose, 
  onLogout 
}, ref) => {
  // RTK Query hooks
  const { 
    data: userData, 
    error: userError, 
    isLoading: isLoadingUser,
    refetch: refetchCurrentUser,
  } = useGetCurrentUserQuery();
  
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const { data: privacySettings, isLoading: isLoadingPrivacy } = useGetPrivacySettingsQuery();
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const [updatePrivacySettings, { isLoading: isUpdatingPrivacy }] = useUpdatePrivacySettingsMutation();
  const [blockUser, { isLoading: isBlockingUser }] = useBlockUserMutation();
  const [unblockUser, { isLoading: isUnblockingUser }] = useUnblockUserMutation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();

  // Local state
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
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [blockUsername, setBlockUsername] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [modal, setModal] = useState<{
    type: 'logout' | 'deleteAccount' | 'success' | 'error';
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const { translations, language, setLanguage } = useLanguage();
  const token = localStorage.getItem('access_token');
  const privacySectionRef = useRef<HTMLElement | null>(null);

  // Initialize component visibility and bio
  useEffect(() => {
    setIsVisible(true);
    if (userData) {
      setBio(userData.bio || ''); // Use bio from userData
      setNewBio(userData.bio || '');
      setDisplayName(userData.display_name || userData.username);
      setNewDisplayName(userData.display_name || userData.username);
    }
  }, [userData]);

  // Handle avatar upload
  const handleAvatarUpload = async (croppedAvatarFile: File) => {
    if (!userData) return;

    setIsUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', croppedAvatarFile);

      // Use the correct avatar upload endpoint
      const response = await fetch(`${BASE_URL}/auth/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        await refetchCurrentUser();
        setModal({
          type: 'success',
          message: 'Avatar updated successfully',
        });
      } else {
        throw new Error('Failed to upload avatar');
      }
      
      if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl);
      setAvatarCropUrl(null);
      setAvatarFile(null);
    } catch (error: any) {
      setModal({
        type: 'error',
        message: error?.message || 'Failed to update avatar',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle bio update
  const handleUpdateBio = async () => {
    if (!userData || newBio === bio) return;

    setIsUpdatingBio(true);
    try {
      // Use the correct bio update endpoint
      const response = await fetch(`${BASE_URL}/auth/me/bio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: newBio }),
      });

      if (response.ok) {
        setBio(newBio);
        setModal({
          type: 'success',
          message: 'Bio updated successfully',
        });
      } else {
        throw new Error('Failed to update bio');
      }
    } catch (error: any) {
      setModal({
        type: 'error',
        message: error?.message || 'Failed to update bio',
      });
    } finally {
      setIsUpdatingBio(false);
    }
  };

  // Handle display name update
  const handleUpdateDisplayName = async () => {
    const normalizedDisplayName = normalizeDisplayName(newDisplayName);
    if (!userData || normalizedDisplayName === displayName) return;

    if (!isValidDisplayName(newDisplayName)) {
      setModal({
        type: 'error',
        message: 'Display name must be between 3 and 50 characters',
      });
      return;
    }

    setIsUpdatingDisplayName(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ display_name: normalizedDisplayName }),
      });

      if (response.ok) {
        setDisplayName(normalizedDisplayName);
        setNewDisplayName(normalizedDisplayName);
        setModal({
          type: 'success',
          message: 'Display name updated successfully',
        });
      } else {
        throw new Error('Failed to update display name');
      }
    } catch (error: any) {
      setModal({
        type: 'error',
        message: error?.message || 'Failed to update display name',
      });
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setModal({
      type: 'logout',
      message: translations.logoutConfirm,
      onConfirm: async () => {
        try {
          await logout().unwrap();
        } catch (error) {
          // Continue with local logout even if API fails
        }
        clearAuthTokens();
        onLogout();
      },
    });
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    setModal({
      type: 'deleteAccount',
      message: translations.deleteAccountConfirm,
      onConfirm: async () => {
        try {
          await deleteAccount().unwrap();
          clearAuthTokens();
          onLogout(); // This will redirect to login
        } catch (error: any) {
          setModal({
            type: 'error',
            message: error?.data?.detail || 'Failed to delete account',
          });
        }
      },
    });
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handlePrivacyChange = async (key: PrivacySettingKey, value: string | boolean) => {
    try {
      await updatePrivacySettings({ [key]: value }).unwrap();
    } catch (error: any) {
      setModal({ type: 'error', message: error?.data?.detail || 'Failed to update privacy settings' });
    }
  };

  const handleBlockUser = async () => {
    const nextUsername = blockUsername.trim();
    if (!nextUsername) return;
    try {
      await blockUser(nextUsername).unwrap();
      setBlockUsername('');
    } catch (error: any) {
      setModal({ type: 'error', message: error?.data?.detail || 'Failed to block user' });
    }
  };

  const handleUnblockUser = async (targetUsername: string) => {
    try {
      await unblockUser(targetUsername).unwrap();
    } catch (error: any) {
      setModal({ type: 'error', message: error?.data?.detail || 'Failed to unblock user' });
    }
  };

  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return DEFAULT_AVATAR;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl}`;
  };

  if (isLoadingUser) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{translations.loading}</span>
        </div>
      </div>
    );
  }

  if (userError || !userData) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <p className="text-red-500 mb-4">Failed to load profile</p>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(userData?.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const displayNameChanged = normalizeDisplayName(newDisplayName) !== displayName;
  const displayNameInvalid = !!newDisplayName && !isValidDisplayName(newDisplayName);
  const futureRows = [
    { label: translations.notifications || 'Notifications', description: translations.comingSoon || 'Coming soon', icon: Bell },
  ];
  const blockedUsers = blockedUsersData?.users || [];
  const visibilityLabel = (value: string) => {
    if (value === 'shared_chats') return translations.sharedChats || 'Shared chats';
    if (value === 'nobody') return translations.nobody || 'Nobody';
    return translations.everyone || 'Everyone';
  };
  const renderPrivacySelect = (
    key: PrivacySettingKey,
    label: string,
    description: string,
    options: readonly string[],
  ) => (
    <div className="flex flex-col gap-2 rounded-md border border-gray-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <select
        value={String(privacySettings?.[key] ?? options[0])}
        onChange={(event) => handlePrivacyChange(key, event.target.value)}
        disabled={!privacySettings || isUpdatingPrivacy}
        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option} value={option}>{visibilityLabel(option)}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div
        ref={ref}
        className={`relative flex h-[min(760px,calc(100vh-3rem))] w-full max-w-xl transform flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-950 shadow-2xl transition-all duration-200 ease-out ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold">{translations.profile}</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-6 pb-5 pt-7 text-center">
            <div className="relative mx-auto h-28 w-28">
              {hasCustomAvatar ? (
                <button
                  type="button"
                  onClick={() => setIsAvatarViewerOpen(true)}
                  className="block rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="View profile picture history"
                >
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-28 w-28 rounded-full border border-gray-200 object-cover shadow-sm transition-opacity hover:opacity-90"
                  />
                </button>
              ) : (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-28 w-28 rounded-full border border-gray-200 object-cover shadow-sm"
                />
              )}
              <label className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      const tempUrl = URL.createObjectURL(file);
                      setAvatarCropUrl(tempUrl);
                    }
                  }}
                />
              </label>
            </div>
            <h3 className="mt-4 break-words text-2xl font-semibold leading-tight text-gray-950">{displayName}</h3>
            <p className="mt-1 break-words text-sm text-gray-500">@{userData.username}</p>
            <p className="mx-auto mt-3 max-w-sm whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
              {bio || translations.noBio || 'No bio'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 border-y border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(true)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm text-primary transition-colors hover:bg-gray-100"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">{translations.createGroup}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAvatarViewerOpen(true)}
              disabled={!hasCustomAvatar}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              <Image className="h-5 w-5" />
              <span className="text-xs font-medium">{translations.avatarHistory || 'Avatar history'}</span>
            </button>
            <button
              type="button"
              onClick={() => privacySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm text-primary transition-colors hover:bg-gray-100"
            >
              <Shield className="h-5 w-5" />
              <span className="text-xs font-medium">{translations.privacy || 'Privacy'}</span>
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.personalInfo || 'Personal info'}</p>
                <p className="mt-1 text-sm text-gray-500">{translations.editProfile || 'Edit how other people see you.'}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{translations.displayName || 'Display name'}</label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    maxLength={50}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-ring"
                    placeholder={translations.displayNameHint || 'Display name (3-50 characters)'}
                  />
                  {displayNameInvalid && (
                    <p className="text-sm text-destructive">
                      {translations.displayNameError || 'Display name must be between 3 and 50 characters'}
                    </p>
                  )}
                  <button
                    onClick={handleUpdateDisplayName}
                    disabled={isUpdatingDisplayName || !displayNameChanged || !isValidDisplayName(newDisplayName)}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {translations.saveDisplayName || 'Save display name'}
                    {isUpdatingDisplayName && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{translations.bio}</label>
                  <textarea
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    className="h-24 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-ring"
                    placeholder={translations.bio}
                  />
                  <button
                    onClick={handleUpdateBio}
                    disabled={isUpdatingBio || newBio === bio}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {translations.saveBio}
                    {isUpdatingBio && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.account || 'Account'}</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{translations.userName}</span>
                  <span className="min-w-0 truncate font-medium text-gray-900">@{userData.username}</span>
                </div>
                {userData.created_at && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500">{translations.created || 'Created'}</span>
                    <span className="min-w-0 truncate font-medium text-gray-900">
                      {formatDate(userData.created_at, language)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{translations.language || 'Language'}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setLanguage('en');
                        window.location.reload();
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        language === 'en'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Globe className="mr-1 inline-block h-3 w-3" />
                      EN
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('ru');
                        window.location.reload();
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        language === 'ru'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Globe className="mr-1 inline-block h-3 w-3" />
                      RU
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section ref={privacySectionRef} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.privacy || 'Privacy'}</p>
                <p className="mt-1 text-sm text-gray-500">{translations.privacyDescription || 'Control who can see and contact you.'}</p>
              </div>

              {isLoadingPrivacy ? (
                <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-4 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {translations.loading}
                </div>
              ) : (
                <div className="space-y-3">
                  {renderPrivacySelect('avatar_visibility', translations.avatarVisibility || 'Avatar visibility', translations.avatarVisibilityDescription || 'Who can see your avatar.', visibilityOptions)}
                  {renderPrivacySelect('profile_visibility', translations.profileVisibility || 'Profile visibility', translations.profileVisibilityDescription || 'Who can see your bio.', visibilityOptions)}
                  {renderPrivacySelect('presence_visibility', translations.presenceVisibility || 'Online status', translations.presenceVisibilityDescription || 'Who can see online and last seen.', visibilityOptions)}
                  {renderPrivacySelect('direct_messages', translations.directMessages || 'Direct messages', translations.directMessagesDescription || 'Who can start a direct chat with you.', visibilityOptions)}
                  {renderPrivacySelect('group_invites', translations.groupInvites || 'Group invites', translations.groupInvitesDescription || 'Who can add you to groups.', visibilityOptions)}
                  {renderPrivacySelect('search_visibility', translations.searchVisibility || 'Search visibility', translations.searchVisibilityDescription || 'Whether you appear in user search.', searchOptions)}

                  <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800">{translations.readReceipts || 'Read receipts'}</span>
                      <span className="block text-xs text-gray-500">{translations.readReceiptsDescription || 'Let others see when you read messages.'}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={!!privacySettings?.read_receipts_enabled}
                      disabled={!privacySettings || isUpdatingPrivacy}
                      onChange={(event) => handlePrivacyChange('read_receipts_enabled', event.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </label>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.blockedUsers || 'Blocked users'}</p>
                <p className="mt-1 text-sm text-gray-500">{translations.blockedUsersDescription || 'Blocked users cannot message, invite, or see private profile details.'}</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={blockUsername}
                  onChange={(event) => setBlockUsername(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleBlockUser()}
                  placeholder={translations.enterUsername || 'Enter username'}
                  className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleBlockUser}
                  disabled={!blockUsername.trim() || isBlockingUser}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isBlockingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : translations.block || 'Block'}
                </button>
              </div>
              <div className="mt-3 rounded-md border border-gray-200">
                {blockedUsers.length ? blockedUsers.map((blockedUser) => (
                  <div key={blockedUser.username} className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2 last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-800">{blockedUser.display_name || blockedUser.username}</div>
                      <div className="truncate text-xs text-gray-500">@{blockedUser.username}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockUser(blockedUser.username)}
                      disabled={isUnblockingUser}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {translations.unblock || 'Unblock'}
                    </button>
                  </div>
                )) : (
                  <div className="px-3 py-3 text-sm text-gray-500">{translations.noBlockedUsers || 'No blocked users'}</div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setIsSecurityOpen(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Smartphone className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">{translations.securityDevices || 'Security & devices'}</span>
                  <span className="block truncate text-xs text-gray-500">{translations.manageSessionsAndPassword || 'Sessions, password, and two-factor authentication'}</span>
                </span>
              </button>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              {futureRows.map(({ label, description, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  className="flex w-full items-center gap-3 border-b border-gray-200 px-4 py-3 text-left last:border-b-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-800">{label}</span>
                    <span className="block truncate text-xs text-gray-500">{description}</span>
                  </span>
                </button>
              ))}
            </section>

            <section className="space-y-2">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {translations.logout}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                {translations.deleteAccount}
              </button>
            </section>
          </div>
        </div>
      </div>

      {/* Group Create Modal */}
      {isGroupModalOpen && (
        <GroupCreateModal
          currentUsername={username}
          onClose={() => setIsGroupModalOpen(false)}
          onCreate={async ({ groupName, description, participants, avatarFile, setRejectedParticipants }) => {
            try {
              const response = await fetch(`${BASE_URL}/groups/create`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: groupName, description, participants }),
              });
              if (response.ok) {
                const createdGroup = await response.json();
                let avatarWarning = '';
                if (avatarFile && createdGroup.chat_id) {
                  const formData = new FormData();
                  formData.append('file', avatarFile);
                  const avatarResponse = await fetch(`${BASE_URL}/groups/${createdGroup.chat_id}/avatar`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });
                  if (!avatarResponse.ok) {
                    avatarWarning = ` ${translations.avatarUploadFailed || 'Avatar upload failed.'}`;
                  }
                }
                setIsGroupModalOpen(false);
                setModal({ type: 'success', message: `${translations.groupCreated}${avatarWarning}` });
              } else {
                const data = await response.json();
                const detail = data.detail || 'Error creating group';
                const rejected = participants.find((participant) => detail.includes(participant));
                if (rejected) {
                  setRejectedParticipants({ [rejected]: detail });
                }
                throw new Error(data.detail || 'Error creating group');
              }
            } catch (err: any) {
              throw new Error(err.message || 'Group creation failed');
            }
          }}
        />
      )}

      {/* Confirmation Modal */}
      {modal && (
        <ConfirmModal
          title={
            modal.type === 'success'
              ? translations.success
              : modal.type === 'logout'
              ? translations.logout
              : modal.type === 'deleteAccount'
              ? translations.deleteAccount
              : translations.error
          }
          message={modal.message}
          onConfirm={modal.onConfirm || (() => setModal(null))}
          onCancel={() => setModal(null)}
          confirmText={modal.type === 'success' || modal.type === 'error' ? 'OK' : translations.confirm}
          isError={modal.type === 'error'}
        />
      )}

      {/* Avatar Crop Modal */}
      {avatarFile && avatarCropUrl && (
        <AvatarCropModal
          file={avatarFile}
          imageUrl={avatarCropUrl}
          isUploading={isUploading}
          onConfirm={handleAvatarUpload}
          onCancel={() => {
            URL.revokeObjectURL(avatarCropUrl);
            setAvatarCropUrl(null);
            setAvatarFile(null);
          }}
        />
      )}

      {isAvatarViewerOpen && hasCustomAvatar && (
        <AvatarHistoryViewer
          username={userData.username}
          displayName={displayName}
          currentAvatarUrl={avatarUrl}
          onClose={() => setIsAvatarViewerOpen(false)}
        />
      )}

      <SecuritySettingsDialog
        open={isSecurityOpen}
        onOpenChange={setIsSecurityOpen}
        onLoggedOut={onLogout}
      />
    </div>
  );
});

ProfileComponentRTK.displayName = 'ProfileComponentRTK';

export default ProfileComponentRTK;
