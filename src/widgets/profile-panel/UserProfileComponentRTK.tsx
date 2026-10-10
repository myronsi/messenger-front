import { asApiError } from '@/shared/lib/apiError';
import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useGetChatAudiosQuery, useGetChatPhotosQuery } from '@/entities/message';
import { useGetUserByUsernameQuery, useUpdateContactDisplayNameMutation, useBlockUserMutation, useGetBlockedUsersQuery, useUnblockUserMutation } from '@/entities/user';
import AvatarHistoryViewer from './ui/AvatarHistoryViewer';
import UserProfileInfoPanel from './ui/UserProfileInfoPanel';
import UserProfileHeader from './ui/UserProfileHeader';
import UserProfileActions from './ui/UserProfileActions';
import { UserProfileShell, UserProfileState } from './ui/UserProfileShell';
import UserProfileConfirmations from './ui/UserProfileConfirmations';
import UserProfilePanelContent, { ProfilePanelView } from './ui/UserProfilePanelContent';
import UserProfilePanelView from './ui/UserProfilePanelView';
import { useProfilePanelTransition } from './useProfilePanelTransition';
import { toProfileAudios, toProfilePhotos } from '@/entities/message';
import type { Id } from '@/shared/lib/ids';
import { isServerId } from '@/shared/lib/ids';

interface UserProfileComponentRTKProps {
  username: string;
  directChatId?: Id;
  onClose: () => void;
  onMessage?: (user: {
    username: string;
    displayName?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
  }) => void;
  onJumpToMessage?: (messageId: Id) => void;
  onDeleteChat?: () => void;
  hideMessageAction?: boolean;
}

const UserProfileComponentRTK: React.FC<UserProfileComponentRTKProps> = ({ 
  username, 
  directChatId,
  onClose,
  onMessage,
  onJumpToMessage,
  onDeleteChat,
  hideMessageAction = false,
}) => {
  const { translations, language } = useLanguage();
  const { activeView, panelTransition, selectView: transitionToView } = useProfilePanelTransition(directChatId, username);
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [customNameInput, setCustomNameInput] = useState('');
  const [isEditingContactName, setIsEditingContactName] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isDeleteChatConfirmOpen, setIsDeleteChatConfirmOpen] = useState(false);
  
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
  const {
    data: chatPhotosData,
    isLoading: isLoadingDmPhotos,
    error: dmPhotosQueryError,
  } = useGetChatPhotosQuery(directChatId || '', {
    skip: !directChatId || !isServerId(directChatId),
  });
  const {
    data: chatAudiosData,
    isLoading: isLoadingDmAudios,
    error: dmAudiosQueryError,
  } = useGetChatAudiosQuery(directChatId || '', {
    skip: !directChatId || !isServerId(directChatId),
  });
  const profileDisplayName = userData?.display_name || username;
  const accountDisplayName = userData?.account_display_name || username;
  const contactDisplayName = userData?.contact_display_name?.trim();
  const isBlocked = !!blockedUsersData?.users?.some((blockedUser) => blockedUser.username === username);
  const isCurrentUser = currentUser?.username === username;
  const isBlockActionLoading = isBlockingUser || isUnblockingUser;
  const dmPhotos = useMemo(() => (
    toProfilePhotos(chatPhotosData?.photos || [], translations.photoMessage || 'Photo')
  ), [chatPhotosData?.photos, translations.photoMessage]);
  const dmAudios = useMemo(() => (
    toProfileAudios(chatAudiosData?.audios || [], translations.audioFile || 'Audio')
  ), [chatAudiosData?.audios, translations.audioFile]);
  const dmPhotosError = dmPhotosQueryError
    ? translations.errorLoadingMessages || translations.errorLoading || 'Error loading messages.'
    : null;
  const dmAudiosError = dmAudiosQueryError
    ? translations.errorLoadingMessages || translations.errorLoading || 'Error loading messages.'
    : null;
  const blockUserConsequences = translations.blockUserConsequences || [
    'They will not be able to send you direct messages.',
    'They will not be able to invite you to groups.',
    'They will not be able to see your private profile details.',
    'Existing chats remain in your list, but messaging requires unblocking them first.',
  ];
  const deleteChatConsequences = translations.deleteChatConsequences || [
    'This chat will be removed from your chat list.',
    'You will lose access to this conversation history in the app.',
    'This does not block the user or change your privacy settings.',
  ];

  useEffect(() => { setActionError(null); }, [directChatId, username]);

  useEffect(() => {
    setCustomNameInput(userData?.contact_display_name || '');
    setIsEditingContactName(false);
  }, [userData?.contact_display_name, username]);

  const getAvatarUrl = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl);

  const handleBlockToggle = async () => {
    if (isCurrentUser || isBlockActionLoading) return;
    setActionError(null);
    try {
      const target = userData?.id ? { id: userData.id } : { username };
      if (isBlocked) {
        await unblockUser(target).unwrap();
      } else {
        await blockUser(target).unwrap();
      }
      setIsBlockConfirmOpen(false);
    } catch (caught) {
      const error = asApiError(caught);
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

  const handleSaveContactName = async () => {
    if (isCurrentUser || isSavingContactName) return;
    const nextName = customNameInput.trim().replace(/\s+/g, ' ');
    setActionError(null);
    try {
      await updateContactDisplayName({ user: userData?.id ? { id: userData.id } : { username }, displayName: nextName || null }).unwrap();
      setCustomNameInput(nextName);
      setIsEditingContactName(false);
    } catch (caught) {
      const error = asApiError(caught);
      setActionError(error?.data?.detail || 'Failed to save custom name');
    }
  };

  const handleCancelContactNameEdit = () => {
    setCustomNameInput(userData?.contact_display_name || '');
    setIsEditingContactName(false);
  };

  if (isLoading || !!error || !userData) {
    return <UserProfileState isLoading={isLoading} unavailable={!!error || !userData} onClose={onClose} />;
  }

  const avatarUrl = getAvatarUrl(userData.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const displayName = profileDisplayName;
  const bio = userData.bio?.trim();
  const hasBlockedRelationship = isBlocked || userData.direct_message_reason === 'blocked';
  const canShowCreatedAt = !!userData.created_at && !hasBlockedRelationship;
  const canShowMessageAction = !hideMessageAction && !isCurrentUser && !!onMessage && (!!userData.can_message || !!userData.direct_chat_id);
  const canShowSearchAction = !!directChatId && isServerId(directChatId) && !isCurrentUser && !!onJumpToMessage;
  const canShowPhotosAction = !!directChatId && isServerId(directChatId) && !isCurrentUser && dmPhotos.length > 0;
  const canShowAudiosAction = !!directChatId && isServerId(directChatId) && !isCurrentUser && dmAudios.length > 0;
  const canShowDmSections = !!directChatId && isServerId(directChatId) && !isCurrentUser;
  const actionCount = [canShowMessageAction, canShowDmSections, canShowSearchAction, canShowPhotosAction, canShowAudiosAction]
    .filter(Boolean).length;
  const actionColumns = Math.min(Math.max(actionCount, 1), 4);
  const visiblePanelOrder: ProfilePanelView[] = [
    'details',
    ...(canShowPhotosAction ? (['photos'] as const) : []),
    ...(canShowAudiosAction ? (['audios'] as const) : []),
    ...(canShowSearchAction ? (['search'] as const) : []),
  ];
  const selectView = (view: ProfilePanelView) => transitionToView(view, visiblePanelOrder);

  const infoPanel = (
    <UserProfileInfoPanel
      username={username}
      language={language}
      bio={bio}
      actionError={actionError}
      isCurrentUser={isCurrentUser}
      isBlocked={isBlocked}
      isBlockActionLoading={isBlockActionLoading}
      canShowCreatedAt={canShowCreatedAt}
      createdAt={userData.created_at ?? undefined}
      isOnline={!!userData.is_online}
      lastSeen={userData.last_seen}
      canDeleteChat={!!onDeleteChat}
      onDeleteChat={() => setIsDeleteChatConfirmOpen(true)}
      onBlockToggle={handleBlockToggle}
      onConfirmBlock={() => setIsBlockConfirmOpen(true)}
    />
  );

  const renderPanelContent = (view: ProfilePanelView, options: { autoFocusSearch?: boolean } = {}) => (
    <UserProfilePanelView
      view={view} autoFocusSearch={options.autoFocusSearch !== false}
      canShowSearch={canShowSearchAction} canShowPhotos={canShowPhotosAction} canShowAudios={canShowAudiosAction}
      chatId={directChatId} onJumpToMessage={onJumpToMessage} photos={dmPhotos} audios={dmAudios}
      isLoadingPhotos={isLoadingDmPhotos} isLoadingAudios={isLoadingDmAudios}
      photosError={dmPhotosError} audiosError={dmAudiosError} infoPanel={infoPanel}
    />
  );

  return (
    <UserProfileShell onClose={onClose}>
      <div className="flex h-full min-h-0 flex-col">
        <UserProfileHeader
          avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar} displayName={displayName} username={username}
          isCurrentUser={isCurrentUser} isEditingContactName={isEditingContactName} customNameInput={customNameInput}
          setCustomNameInput={setCustomNameInput} onSaveContactName={handleSaveContactName}
          onCancelContactNameEdit={handleCancelContactNameEdit}
          onEditContactName={() => { setCustomNameInput(contactDisplayName || ''); setIsEditingContactName(true); }}
          isSavingContactName={isSavingContactName} accountDisplayName={accountDisplayName}
          isOnline={!!userData.is_online} lastSeen={userData.last_seen} onAvatarHistory={() => setIsAvatarViewerOpen(true)}
        />

        <UserProfileActions
          actionCount={actionCount} actionColumns={actionColumns}
          showDetails={canShowDmSections} showMessage={canShowMessageAction}
          showPhotos={canShowPhotosAction} showAudios={canShowAudiosAction}
          showSearch={canShowSearchAction} activeView={activeView}
          onSelectView={selectView} onMessage={handleMessage}
        />

        <UserProfilePanelContent activeView={activeView} transition={panelTransition} renderPanelContent={renderPanelContent} />
      </div>
      <UserProfileConfirmations
        isBlockConfirmOpen={isBlockConfirmOpen} isDeleteChatConfirmOpen={isDeleteChatConfirmOpen}
        displayName={displayName} blockConsequences={blockUserConsequences} deleteConsequences={deleteChatConsequences}
        onCancelBlock={() => setIsBlockConfirmOpen(false)} onConfirmBlock={handleBlockToggle}
        onCancelDeleteChat={() => setIsDeleteChatConfirmOpen(false)}
        onConfirmDeleteChat={() => { setIsDeleteChatConfirmOpen(false); onDeleteChat?.(); }}
      />
      {isAvatarViewerOpen && hasCustomAvatar && (
        <AvatarHistoryViewer
          username={username}
          displayName={displayName}
          currentAvatarUrl={avatarUrl}
          onClose={() => setIsAvatarViewerOpen(false)}
        />
      )}
    </UserProfileShell>
  );
};

export default UserProfileComponentRTK;
