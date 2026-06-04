import React, { useEffect, useState } from 'react';
import { Ban, BellOff, Check, Info, Loader2, MessageCircle, Pencil, Search, Trash2, UserRound, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useBlockUserMutation, useGetBlockedUsersQuery, useGetCurrentUserQuery, useGetUserByUsernameQuery, useUnblockUserMutation, useUpdateContactDisplayNameMutation } from '@/app/api/messengerApi';
import AvatarHistoryViewer from '@/features/profiles/AvatarHistoryViewer';
import { getPresenceLabel } from '@/shared/utils/presenceFormatters';
import { formatDateOnly } from '@/shared/utils/dateFormatters';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UserProfileComponentRTKProps {
  username: string;
  onClose: () => void;
  onMessage?: (user: {
    username: string;
    displayName?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
  }) => void;
  onSearchMessages?: () => void;
  onDeleteChat?: () => void;
}

const UserProfileComponentRTK: React.FC<UserProfileComponentRTKProps> = ({ 
  username, 
  onClose,
  onMessage,
  onSearchMessages,
  onDeleteChat,
}) => {
  const { translations, language } = useLanguage();
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [customNameInput, setCustomNameInput] = useState('');
  const [isEditingContactName, setIsEditingContactName] = useState(false);
  
  // Use username-based query instead of user ID
  const { 
    data: userData, 
    error, 
    isLoading 
  } = useGetUserByUsernameQuery(username);
  const { data: currentUser } = useGetCurrentUserQuery();
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const [blockUser, { isLoading: isBlockingUser }] = useBlockUserMutation();
  const [unblockUser, { isLoading: isUnblockingUser }] = useUnblockUserMutation();
  const [updateContactDisplayName, { isLoading: isSavingContactName }] = useUpdateContactDisplayNameMutation();
  const profileDisplayName = userData?.display_name || username;
  const accountDisplayName = userData?.account_display_name || username;
  const contactDisplayName = userData?.contact_display_name?.trim();
  const isBlocked = !!blockedUsersData?.users?.some((blockedUser) => blockedUser.username === username);
  const isCurrentUser = currentUser?.username === username;
  const isBlockActionLoading = isBlockingUser || isUnblockingUser;

  useEffect(() => {
    setActionError(null);
  }, [username]);

  useEffect(() => {
    setCustomNameInput(userData?.contact_display_name || '');
    setIsEditingContactName(false);
  }, [userData?.contact_display_name, username]);

  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return DEFAULT_AVATAR;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl}`;
  };

  const handleBlockToggle = async () => {
    if (isCurrentUser || isBlockActionLoading) return;
    setActionError(null);
    try {
      if (isBlocked) {
        await unblockUser(username).unwrap();
      } else {
        await blockUser(username).unwrap();
      }
    } catch (error: any) {
      setActionError(error?.data?.detail || (isBlocked ? 'Failed to unblock user' : 'Failed to block user'));
    }
  };

  const handleMessage = () => {
    if (onMessage) {
      onMessage({
        username,
        displayName: profileDisplayName,
        isOnline: userData?.is_online,
        lastSeen: userData?.last_seen,
      });
      return;
    }
    onClose();
  };

  const handleSearchMessages = () => {
    if (onSearchMessages) {
      onSearchMessages();
    }
  };

  const handleSaveContactName = async () => {
    if (isCurrentUser || isSavingContactName) return;
    const nextName = customNameInput.trim().replace(/\s+/g, ' ');
    setActionError(null);
    try {
      const updatedUser = await updateContactDisplayName({ username, displayName: nextName || null }).unwrap();
      setCustomNameInput(updatedUser.contact_display_name || '');
      setIsEditingContactName(false);
    } catch (error: any) {
      setActionError(error?.data?.detail || 'Failed to save custom name');
    }
  };

  const handleCancelContactNameEdit = () => {
    setCustomNameInput(userData?.contact_display_name || '');
    setIsEditingContactName(false);
  };

  const ProfileShell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex h-full min-h-0 w-full flex-col bg-white text-gray-950">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-semibold">{translations.userProfile}</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );

  if (isLoading) {
    return (
      <ProfileShell>
        <div className="flex h-full min-h-[360px] items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{translations.loading}</span>
          </div>
        </div>
      </ProfileShell>
    );
  }

  if (error || !userData) {
    return (
      <ProfileShell>
        <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <UserRound className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">{translations.userProfile}</h3>
          <p className="max-w-xs text-sm text-gray-500">{translations.accountDeletedOrUnavailable}</p>
        </div>
      </ProfileShell>
    );
  }

  const avatarUrl = getAvatarUrl(userData.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const displayName = profileDisplayName;
  const bio = userData.bio?.trim();
  const futureActions = [
    { label: translations.mute || 'Mute', icon: BellOff },
  ];
  const canShowMessageAction = !isCurrentUser && !!onMessage && (!!userData.can_message || !!userData.direct_chat_id);
  const actionCount = (canShowMessageAction ? 1 : 0) + futureActions.length + (onSearchMessages ? 1 : 0) + (!isCurrentUser ? 1 : 0);

  return (
    <ProfileShell>
      <div className="flex min-h-full flex-col">
        <div className="px-6 pb-5 pt-7 text-center">
          {hasCustomAvatar ? (
            <button
              onClick={() => setIsAvatarViewerOpen(true)}
              className="mx-auto block rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
              className="mx-auto h-28 w-28 rounded-full border border-gray-200 object-cover shadow-sm"
            />
          )}
          <h3 className="mt-4 break-words text-2xl font-semibold leading-tight text-gray-950">{displayName}</h3>
          <p className="mt-1 break-words text-sm text-gray-500">@{username}</p>
          {!isCurrentUser && (
            <div className="mt-2 flex justify-center px-2">
              {isEditingContactName ? (
                <div className="flex w-full max-w-xs items-center gap-1">
                  <input
                    autoFocus
                    value={customNameInput}
                    onChange={(event) => setCustomNameInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleSaveContactName();
                      if (event.key === 'Escape') handleCancelContactNameEdit();
                    }}
                    maxLength={50}
                    placeholder={accountDisplayName}
                    className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveContactName}
                    disabled={isSavingContactName}
                    className="rounded-md p-2 text-primary transition-colors hover:bg-gray-100 disabled:opacity-50"
                    aria-label={translations.save || 'Save'}
                  >
                    {isSavingContactName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelContactNameEdit}
                    disabled={isSavingContactName}
                    className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                    aria-label={translations.cancel || 'Cancel'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="group flex max-w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
                  <span className="min-w-0 truncate">
                    {(translations.accountName || 'Account name')}: {accountDisplayName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomNameInput(contactDisplayName || '');
                      setIsEditingContactName(true);
                    }}
                    className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-800 group-hover:opacity-100 focus:opacity-100"
                    aria-label={translations.customName || 'Custom name'}
                    title={translations.customName || 'Custom name'}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="mt-3 inline-flex max-w-full items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            <span className={`mr-2 h-2 w-2 rounded-full ${userData.is_online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            <span className="truncate">{getPresenceLabel(userData.is_online, userData.last_seen)}</span>
          </div>
        </div>

        {actionCount > 0 && (
          <div
            className="grid gap-2 border-y border-gray-200 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(actionCount, 4)}, minmax(0, 1fr))` }}
          >
            {canShowMessageAction && (
              <button
                onClick={handleMessage}
                className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm text-primary transition-colors hover:bg-gray-100"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-xs font-medium">{translations.message || 'Message'}</span>
              </button>
            )}
            {futureActions.map(({ label, icon: Icon }) => (
              <button
                key={label}
                disabled
                className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm text-gray-400"
                title={translations.comingSoon || 'Coming soon'}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
            {onSearchMessages && (
              <button
                onClick={handleSearchMessages}
                className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Search className="h-5 w-5" />
                <span className="text-xs font-medium">{translations.search || 'Search'}</span>
              </button>
            )}
            {!isCurrentUser && (
              <button
                onClick={handleBlockToggle}
                disabled={isBlockActionLoading}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors ${
                  isBlocked
                    ? 'text-primary hover:bg-gray-100 disabled:text-gray-400'
                    : 'text-red-600 hover:bg-red-50 disabled:text-gray-400'
                }`}
              >
                {isBlockActionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Ban className="h-5 w-5" />}
                <span className="text-xs font-medium">{isBlocked ? translations.unblock || 'Unblock' : translations.block || 'Block'}</span>
              </button>
            )}
          </div>
        )}

        <div className="flex-1 space-y-4 px-5 py-5">
          {actionError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Info className="h-4 w-4 text-gray-500" />
              <span>{translations.bio}</span>
            </div>
            <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${bio ? 'text-gray-900' : 'text-gray-500'}`}>
              {bio || translations.noBio || 'No bio'}
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.account || 'Account'}</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">{translations.userName || 'Username'}</span>
                <span className="min-w-0 truncate font-medium text-gray-900">@{username}</span>
              </div>
              {userData.created_at && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{translations.created || 'Created'}</span>
                  <span className="min-w-0 truncate font-medium text-gray-900">
                    {formatDateOnly(userData.created_at, language)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">{translations.status || 'Status'}</span>
                <span className="min-w-0 truncate font-medium text-gray-900">
                  {getPresenceLabel(userData.is_online, userData.last_seen)}
                </span>
              </div>
            </div>
          </section>

          {onDeleteChat && (
            <button
              onClick={onDeleteChat}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              {translations.deleteChat}
            </button>
          )}
        </div>
      </div>
      {isAvatarViewerOpen && hasCustomAvatar && (
        <AvatarHistoryViewer
          username={username}
          displayName={displayName}
          currentAvatarUrl={avatarUrl}
          onClose={() => setIsAvatarViewerOpen(false)}
        />
      )}
    </ProfileShell>
  );
};

export default UserProfileComponentRTK;
