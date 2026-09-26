import React, { useMemo, useState, useEffect, forwardRef } from 'react';
import AvatarCropModal from './ui/AvatarCropModal';
import AvatarHistoryViewer from './ui/AvatarHistoryViewer';
import PrivacySettingsPanel from './ui/PrivacySettingsDialog';
import SecuritySettingsPanel from './ui/SecuritySettingsDialog';
import { AtSign, Bell, CalendarDays, Camera, Check, ChevronDown, ChevronRight, Globe, Image, Inbox, Loader2, LogOut, MessageSquare, Shield, Smartphone, Trash, UserRound, Users, X } from 'lucide-react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import GroupCreateModal from '@/features/groups/ui/GroupCreateModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { formatDate } from '@/shared/utils/dateFormatters';
import type { ApprovalRequest } from '@/entities/chat';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { 
  useGetCurrentUserQuery, 
  useGetBlockedUsersQuery,
  useGetOneOnOneChatsQuery,
  useGetApprovalRequestInboxQuery,
  useApproveApprovalRequestMutation,
  useRejectApprovalRequestMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useUpdateUserMutation, 
  useLogoutMutation,
  useDeleteAccountMutation
} from '@/app/api/messengerApi';
import { clearAuthTokens } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const BIO_MAX_LENGTH = 500;
const normalizeDisplayName = (value: string) => value.trim().replace(/\s+/g, ' ');
const isValidDisplayName = (value: string) => {
  const normalized = normalizeDisplayName(value);
  return normalized.length >= 3 && normalized.length <= 50;
};

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
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const { data: dmChatsData } = useGetOneOnOneChatsQuery(userData?.username || '', {
    skip: !userData?.username,
  });
  const {
    data: requestInbox,
    refetch: refetchRequestInbox,
  } = useGetApprovalRequestInboxQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [approveRequest, { isLoading: isApprovingRequest }] = useApproveApprovalRequestMutation();
  const [rejectRequest, { isLoading: isRejectingRequest }] = useRejectApprovalRequestMutation();
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
  const [activeProfilePage, setActiveProfilePage] = useState<'profile' | 'requests' | 'personal' | 'privacy' | 'security'>('profile');
  const [blockUsername, setBlockUsername] = useState('');
  const [pendingBlockUsername, setPendingBlockUsername] = useState('');
  const [isBlockDmContactsCollapsed, setIsBlockDmContactsCollapsed] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [modal, setModal] = useState<{
    type: 'logout' | 'deleteAccount' | 'blockUser' | 'success' | 'error';
    message: string;
    consequences?: string[];
    onConfirm?: () => void;
  } | null>(null);

  const { translations, language, setLanguage } = useLanguage();
  const token = localStorage.getItem('access_token');
  const blockUserConsequences = translations.blockUserConsequences || [
    'They will not be able to send you direct messages.',
    'They will not be able to invite you to groups.',
    'They will not be able to see your private profile details.',
    'Existing chats remain in your list, but messaging requires unblocking them first.',
  ];
  const pendingRequestCount = requestInbox?.unread_count || 0;

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

  const blockedUsers = blockedUsersData?.users || [];
  const blockedUsernameSet = useMemo(() => (
    new Set(blockedUsers.map((blockedUser) => blockedUser.username.toLowerCase()))
  ), [blockedUsers]);
  const blockDmContactSuggestions = useMemo(() => {
    const currentUsername = userData?.username?.toLowerCase() || '';
    const query = blockUsername.trim().toLowerCase();
    const seen = new Set<string>();
    return (dmChatsData?.chats || [])
      .filter((chat) => !chat.interlocutor_deleted && !!chat.interlocutor_name)
      .map((chat) => ({
        username: chat.interlocutor_name,
        display_name: chat.interlocutor_display_name || chat.interlocutor_name,
        avatar_url: chat.avatar_url,
      }))
      .filter((contact) => {
        const usernameKey = contact.username.toLowerCase();
        if (usernameKey === currentUsername) return false;
        if (blockedUsernameSet.has(usernameKey)) return false;
        if (seen.has(usernameKey)) return false;
        seen.add(usernameKey);
        if (!query) return true;
        return usernameKey.includes(query) || (contact.display_name || '').toLowerCase().includes(query);
      })
      .slice(0, 6);
  }, [blockUsername, blockedUsernameSet, dmChatsData?.chats, userData?.username]);

  const handleBlockUser = async (usernameOverride?: string) => {
    const nextUsername = (usernameOverride || blockUsername).trim();
    if (!nextUsername) return;
    setPendingBlockUsername(nextUsername);
    setModal({
      type: 'blockUser',
      message: translations.blockUserConfirmMessage || 'After blocking this user, the following consequences will apply:',
      consequences: blockUserConsequences,
      onConfirm: async () => {
        try {
          await blockUser(nextUsername).unwrap();
          setBlockUsername('');
          setPendingBlockUsername('');
          setModal(null);
        } catch (error: any) {
          setModal({ type: 'error', message: error?.data?.detail || 'Failed to block user' });
        }
      },
    });
  };

  const handleBlockUserConfirmed = async () => {
    const nextUsername = pendingBlockUsername.trim();
    if (!nextUsername) return;
    try {
      await blockUser(nextUsername).unwrap();
      setBlockUsername('');
      setPendingBlockUsername('');
      setModal(null);
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

  const handleApproveRequest = async (request: ApprovalRequest) => {
    try {
      await approveRequest(request.id).unwrap();
      refetchRequestInbox();
    } catch (error: any) {
      setModal({ type: 'error', message: error?.data?.detail || error?.message || 'Failed to approve request' });
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await rejectRequest(requestId).unwrap();
      refetchRequestInbox();
    } catch (error: any) {
      setModal({ type: 'error', message: error?.data?.detail || error?.message || 'Failed to reject request' });
    }
  };

  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return DEFAULT_AVATAR;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl}`;
  };

  const getMediaUrl = (path?: string | null, fallback = DEFAULT_AVATAR) => {
    if (!path) return fallback;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${BASE_URL}${path}`;
  };

  if (isLoadingUser) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white sm:bg-white/80 sm:backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{translations.loading}</span>
        </div>
      </div>
    );
  }

  if (userError || !userData) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white p-4 sm:bg-white/80 sm:backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
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
  const settingsRows = [
    ...(pendingRequestCount > 0 ? [{
      label: translations.requestInbox || 'Request inbox',
      description: `${pendingRequestCount} ${translations.pendingRequests || 'pending requests'}`,
      icon: Inbox,
      indicatorCount: pendingRequestCount,
      onClick: () => setActiveProfilePage('requests' as const),
    }] : []),
    {
      label: translations.personalInfo || 'Personal info',
      description: translations.editProfile || 'Edit how other people see you.',
      icon: UserRound,
      indicatorCount: 0,
      onClick: () => setActiveProfilePage('personal'),
    },
    {
      label: translations.privacy || 'Privacy',
      description: translations.privacyDescription || 'Control who can see and contact you.',
      icon: Shield,
      indicatorCount: 0,
      onClick: () => setActiveProfilePage('privacy'),
    },
    {
      label: translations.securityDevices || 'Security & devices',
      description: translations.manageSessionsAndPassword || 'Sessions, password, and two-factor authentication',
      icon: Smartphone,
      indicatorCount: 0,
      onClick: () => setActiveProfilePage('security'),
    },
  ];
  const futureSettingsRows = [
    { label: translations.notifications || 'Notifications', description: translations.comingSoon || 'Coming soon', icon: Bell },
  ];
  return (
    <div
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className={`fixed inset-0 z-[1000] flex items-stretch justify-stretch bg-white p-0 transition-opacity duration-200 sm:items-center sm:justify-center sm:bg-black/40 sm:px-4 sm:py-6 ${isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div
        ref={ref}
        className={`relative flex h-[100dvh] w-full max-w-none transform flex-col overflow-hidden border-0 bg-white text-gray-950 shadow-none transition-all duration-200 ease-out sm:h-[min(760px,calc(100vh-3rem))] sm:max-w-xl sm:rounded-lg sm:border sm:border-gray-200 sm:shadow-2xl ${isVisible ? 'translate-x-0 scale-100 opacity-100 sm:translate-y-0' : 'translate-x-full opacity-0 sm:translate-x-0 sm:translate-y-2 sm:scale-95'}`}
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

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            aria-hidden={activeProfilePage !== 'profile'}
            inert={activeProfilePage !== 'profile' ? true : undefined}
            className={`absolute inset-0 overflow-y-auto bg-white transition-transform duration-300 ease-out will-change-transform ${
              activeProfilePage === 'profile' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none -translate-x-full'
            }`}
          >
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

          <div className="grid grid-cols-2 gap-2 border-y border-gray-200 px-4 py-3">
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
          </div>

          <div className="space-y-4 px-5 py-5">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.account || 'Account'}</p>
                <p className="mt-1 text-sm text-gray-500">{translations.accountDetails || 'Username, account age, and app language.'}</p>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                    <AtSign className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs text-gray-500">{translations.userName}</span>
                    <span className="block truncate text-sm font-medium text-gray-900">@{userData.username}</span>
                  </div>
                </div>
                {userData.created_at && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs text-gray-500">{translations.created || 'Created'}</span>
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {formatDate(userData.created_at, language)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                      <Globe className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs text-gray-500">{translations.language || 'Language'}</span>
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {language === 'ru' ? 'Русский' : 'English'}
                      </span>
                    </div>
                  </div>
                  <div className="grid h-9 grid-cols-2 rounded-md border border-gray-200 bg-gray-100 p-1 sm:w-36">
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('en');
                        window.location.reload();
                      }}
                      className={`rounded px-3 text-xs font-medium transition-colors ${
                        language === 'en'
                          ? 'bg-white text-gray-950 shadow-sm'
                          : 'text-gray-600 hover:text-gray-950'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('ru');
                        window.location.reload();
                      }}
                      className={`rounded px-3 text-xs font-medium transition-colors ${
                        language === 'ru'
                          ? 'bg-white text-gray-950 shadow-sm'
                          : 'text-gray-600 hover:text-gray-950'
                      }`}
                    >
                      RU
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.settings || 'Settings'}</p>
                <p className="mt-1 text-sm text-gray-500">{translations.manageAccountSettings || 'Manage privacy, sessions, and account preferences.'}</p>
              </div>
              {settingsRows.map(({ label, description, icon: Icon, indicatorCount, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="flex w-full items-center gap-3 border-b border-gray-200 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-800">{label}</span>
                    <span className="block truncate text-xs text-gray-500">{description}</span>
                  </span>
                  {indicatorCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                      {indicatorCount > 99 ? '99+' : indicatorCount}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
              ))}
              {futureSettingsRows.map(({ label, description, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  className="flex w-full items-center gap-3 border-t border-gray-200 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-800">{label}</span>
                    <span className="block truncate text-xs text-gray-500">{description}</span>
                  </span>
                </button>
              ))}
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
              {blockDmContactSuggestions.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-md border border-dashed border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setIsBlockDmContactsCollapsed((collapsed) => !collapsed)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                    aria-expanded={!isBlockDmContactsCollapsed}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800">
                        {translations.directMessages || 'Direct messages'}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {blockDmContactSuggestions.length} {translations.available || 'available'}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${isBlockDmContactsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                  </button>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isBlockDmContactsCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="max-h-44 overflow-y-auto border-t border-gray-200 p-1">
                        {blockDmContactSuggestions.map((contact) => (
                          <button
                            key={contact.username}
                            type="button"
                            onClick={() => handleBlockUser(contact.username)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-white"
                          >
                            <img src={getAvatarUrl(contact.avatar_url)} alt={contact.username} className="h-8 w-8 rounded-full object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-gray-900">{contact.display_name || contact.username}</span>
                              <span className="block truncate text-xs text-gray-500">@{contact.username}</span>
                            </span>
                            <Shield className="h-4 w-4 text-gray-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

          <div
            aria-hidden={activeProfilePage !== 'requests'}
            inert={activeProfilePage !== 'requests' ? true : undefined}
            className={`absolute inset-0 transition-transform duration-300 ease-out will-change-transform ${
              activeProfilePage === 'requests' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
            }`}
          >
            <div className="flex h-full flex-col bg-white">
              <div className="border-b border-border px-5 py-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild className="cursor-pointer">
                        <button type="button" onClick={() => setActiveProfilePage('profile')}>
                          {translations.profile || 'Profile'}
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
                        <Inbox className="h-4 w-4 text-muted-foreground" />
                        {translations.requestInbox || 'Request inbox'}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {pendingRequestCount} {translations.pendingRequests || 'pending requests'}
                  </p>
                </div>

                {(requestInbox?.requests || []).length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    <MessageSquare className="mb-2 h-10 w-10" />
                    {translations.noRequests || 'No pending requests'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(requestInbox?.requests || []).map((request) => {
                      const requester = request.requester;
                      const isDmRequest = request.type === 'direct_message';
                      const title = isDmRequest
                        ? translations.directMessageRequest || 'Direct message request'
                        : translations.groupInviteRequest || 'Group invite request';
                      const subject = isDmRequest
                        ? requester?.display_name || requester?.username || translations.deletedUser || 'Deleted User'
                        : request.group?.name || translations.group || 'Group';
                      const subtitle = isDmRequest
                        ? `@${requester?.username || ''}`
                        : `${translations.from || 'From'} ${requester?.display_name || requester?.username || translations.deletedUser || 'Deleted User'}`;
                      const avatar = isDmRequest
                        ? getMediaUrl(requester?.avatar_url)
                        : getMediaUrl(request.group?.avatar_url, `${BASE_URL}${DEFAULT_GROUP_AVATAR}`);

                      return (
                        <div key={request.id} className="rounded-lg border border-border bg-white p-3 shadow-sm">
                          <div className="flex gap-3">
                            <img src={avatar} alt={subject} className="h-11 w-11 rounded-full object-cover" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium uppercase text-muted-foreground">{title}</div>
                              <div className="truncate text-sm font-semibold text-foreground">{subject}</div>
                              <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                              {isDmRequest && request.message_text && (
                                <div className="mt-2 rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                                  {request.message_text}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={isApprovingRequest || isRejectingRequest}
                              onClick={() => handleRejectRequest(request.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              {translations.reject || 'Reject'}
                            </button>
                            <button
                              type="button"
                              disabled={isApprovingRequest || isRejectingRequest}
                              onClick={() => handleApproveRequest(request)}
                              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                              {translations.approve || 'Approve'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            aria-hidden={activeProfilePage !== 'personal'}
            inert={activeProfilePage !== 'personal' ? true : undefined}
            className={`absolute inset-0 transition-transform duration-300 ease-out will-change-transform ${
              activeProfilePage === 'personal' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
            }`}
          >
            <div className="flex h-full flex-col bg-white">
              <div className="border-b border-border px-5 py-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild className="cursor-pointer">
                        <button type="button" onClick={() => setActiveProfilePage('profile')}>
                          {translations.profile || 'Profile'}
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild className="cursor-pointer">
                        <button type="button" onClick={() => setActiveProfilePage('profile')}>
                          {translations.settings || 'Settings'}
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        {translations.personalInfo || 'Personal info'}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <p className="text-sm text-muted-foreground">
                  {translations.editProfile || 'Edit how other people see you.'}
                </p>

                <section className="rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{translations.displayName || 'Display name'}</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        maxLength={50}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-foreground outline-none focus:ring-2 focus:ring-ring"
                        placeholder={translations.displayNameHint || 'Display name (3-50 characters)'}
                      />
                      {displayNameChanged && (
                        <button
                          type="button"
                          onClick={handleUpdateDisplayName}
                          disabled={isUpdatingDisplayName || !isValidDisplayName(newDisplayName)}
                          className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
                          aria-label={translations.saveDisplayName || 'Save display name'}
                          title={translations.saveDisplayName || 'Save display name'}
                        >
                          {isUpdatingDisplayName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    {displayNameInvalid && (
                      <p className="text-sm text-destructive">
                        {translations.displayNameError || 'Display name must be between 3 and 50 characters'}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-foreground">{translations.bio}</label>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {newBio.length}/{BIO_MAX_LENGTH}
                      </span>
                    </div>
                    <div className="relative">
                      <textarea
                        value={newBio}
                        onChange={(e) => setNewBio(e.target.value)}
                        maxLength={BIO_MAX_LENGTH}
                        className="h-28 w-full resize-none rounded-md border border-input bg-background px-3 py-2 pr-12 text-foreground outline-none focus:ring-2 focus:ring-ring"
                        placeholder={translations.bio}
                      />
                      {newBio !== bio && (
                        <button
                          type="button"
                          onClick={handleUpdateBio}
                          disabled={isUpdatingBio}
                          className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
                          aria-label={translations.saveBio || 'Save bio'}
                          title={translations.saveBio || 'Save bio'}
                        >
                          {isUpdatingBio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div
            aria-hidden={activeProfilePage !== 'privacy'}
            inert={activeProfilePage !== 'privacy' ? true : undefined}
            className={`absolute inset-0 transition-transform duration-300 ease-out will-change-transform ${
              activeProfilePage === 'privacy' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
            }`}
          >
            <PrivacySettingsPanel
              isActive={activeProfilePage === 'privacy'}
              onBack={() => setActiveProfilePage('profile')}
            />
          </div>

          <div
            aria-hidden={activeProfilePage !== 'security'}
            inert={activeProfilePage !== 'security' ? true : undefined}
            className={`absolute inset-0 transition-transform duration-300 ease-out will-change-transform ${
              activeProfilePage === 'security' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
            }`}
          >
            <SecuritySettingsPanel
              isActive={activeProfilePage === 'security'}
              onBack={() => setActiveProfilePage('profile')}
              onLoggedOut={onLogout}
            />
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
              : modal.type === 'blockUser'
              ? translations.blockUserConfirmTitle || `Block ${pendingBlockUsername}?`
              : translations.error
          }
          message={modal.message}
          consequences={modal.consequences}
          onConfirm={modal.type === 'blockUser' ? handleBlockUserConfirmed : modal.onConfirm || (() => setModal(null))}
          onCancel={() => {
            if (modal.type === 'blockUser') setPendingBlockUsername('');
            setModal(null);
          }}
          confirmText={modal.type === 'success' || modal.type === 'error' ? 'OK' : modal.type === 'blockUser' ? translations.block || 'Block' : translations.confirm}
          isError={modal.type === 'error'}
          isDestructive={modal.type === 'blockUser' || modal.type === 'deleteAccount'}
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

    </div>
  );
});

ProfileComponentRTK.displayName = 'ProfileComponentRTK';

export default ProfileComponentRTK;
