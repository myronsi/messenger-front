import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import { asApiError } from '@/shared/lib/apiError';
import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useGetChatAudiosQuery, useGetChatPhotosQuery } from '@/entities/message';
import {
  useGetUserByUsernameQuery, useUpdateContactDisplayNameMutation, useDeleteContactDisplayNameMutation,
  useBlockUserMutation, useGetBlockedUsersQuery, useUnblockUserMutation,
} from '@/entities/user';
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

interface UserProfileComponentRTKProps {
  username: string;
  directChatId?: EntityId;
  onClose: () => void;
  onMessage?: (user: {
    username: string;
    displayName?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
  }) => void;
  onDeleteChat?: () => void;
  hideMessageAction?: boolean;
  onJumpToMessage?: (messageId: EntityId) => void;
}

const UserProfileComponentRTK: React.FC<UserProfileComponentRTKProps> = ({
  username,
  directChatId,
  onClose,
  onMessage,
  onDeleteChat,
  hideMessageAction = false,
  onJumpToMessage,
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
  const [updateContactDisplayName, { isLoading: isUpdatingContactName }] = useUpdateContactDisplayNameMutation();
  const [deleteContactDisplayName, { isLoading: isDeletingContactName }] = useDeleteContactDisplayNameMutation();
  const isSavingContactName = isUpdatingContactName || isDeletingContactName;
  const {
    data: chatPhotosData,
    isLoading: isLoadingDmPhotos,
    error: dmPhotosQueryError,
  } = useGetChatPhotosQuery(directChatId || 0, {
    skip: !directChatId || !isPersistedId(directChatId),
  });
  const {
    data: chatAudiosData,
    isLoading: isLoadingDmAudios,
    error: dmAudiosQueryError,
  } = useGetChatAudiosQuery(directChatId || 0, {
    skip: !directChatId || !isPersistedId(directChatId),
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
      if (isBlocked) {
        await unblockUser(username).unwrap();
      } else {
        await blockUser(username).unwrap();
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
    setIsEditingContactName(false);
    try {
      if (!nextName) {
        if (contactDisplayName) await deleteContactDisplayName(username).unwrap();
        setCustomNameInput('');
        setIsEditingContactName(false);
        return;
      }
      const updatedUser = await updateContactDisplayName({ username, displayName: nextName }).unwrap();
      setCustomNameInput(updatedUser.contact_display_name || '');
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
  const canShowPhotosAction = !!directChatId && isPersistedId(directChatId) && !isCurrentUser && dmPhotos.length > 0;
  const canShowAudiosAction = !!directChatId && isPersistedId(directChatId) && !isCurrentUser && dmAudios.length > 0;
  const canShowDmSections = !!directChatId && isPersistedId(directChatId) && !isCurrentUser;
  const actionCount = [canShowMessageAction, canShowDmSections, canShowPhotosAction, canShowAudiosAction, canShowDmSections]
    .filter(Boolean).length;
  const actionColumns = Math.min(Math.max(actionCount, 1), 4);
  const visiblePanelOrder: ProfilePanelView[] = [
    'details',
    ...(canShowPhotosAction ? (['photos'] as const) : []),
    ...(canShowAudiosAction ? (['audios'] as const) : []),
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
      canDeleteChat={!!onDeleteChat}
      onDeleteChat={() => setIsDeleteChatConfirmOpen(true)}
      onBlockToggle={handleBlockToggle}
      onConfirmBlock={() => setIsBlockConfirmOpen(true)}
    />
  );

  const renderPanelContent = (view: ProfilePanelView) => (
    <UserProfilePanelView
      view={view} canShowPhotos={canShowPhotosAction} canShowAudios={canShowAudiosAction}
      photos={dmPhotos} audios={dmAudios}
      isLoadingPhotos={isLoadingDmPhotos} isLoadingAudios={isLoadingDmAudios}
      photosError={dmPhotosError} audiosError={dmAudiosError} infoPanel={infoPanel} currentUsername={currentUser?.username}
      onJumpToMessage={onJumpToMessage}
    />
  );

  return (
    <UserProfileShell onClose={onClose}>
      <div data-profile-swipe className="flex h-full min-h-0 flex-col">
        <UserProfileHeader
          avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar} displayName={displayName}
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
          muteChatId={canShowDmSections ? directChatId : undefined} activeView={activeView}
          onSelectView={selectView} onMessage={handleMessage}
        />

        <UserProfilePanelContent activeView={activeView} visibleViews={visiblePanelOrder} onSelectView={selectView}
          transition={panelTransition} renderPanelContent={renderPanelContent} />
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
