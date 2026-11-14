import { isPersistedId } from '@/shared/api/entityId';
import { useStoredValue, userByNameKey } from '@/shared/api/offlineStore';
import type { EntityId } from '@/shared/api/entityId';
import { asApiError } from '@/shared/lib/apiError';
import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useGetChatAudiosQuery, useGetChatFilesQuery, useGetChatLinksQuery, useGetChatPhotosQuery } from '@/entities/message';
import {
  useGetUserByUsernameQuery, useUpdateContactDisplayNameMutation, useDeleteContactDisplayNameMutation,
  useBlockUserMutation, useGetBlockedUsersQuery, useUnblockUserMutation,
} from '@/entities/user';
import AvatarHistoryViewer from './ui/AvatarHistoryViewer';
import UserProfileInfoPanel from './ui/UserProfileInfoPanel';
import UserProfileHero from './ui/UserProfileHero';
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
  onDeleteChat?: (scope: 'me' | 'everyone') => void;
  hideMessageAction?: boolean;
  onJumpToMessage?: (messageId: EntityId) => void;
  onOpenGroup?: (group: { id: EntityId; name: string; avatarUrl?: string }) => void;
  onEditProfile?: () => void;
  hideBackOnMobile?: boolean;
}

const UserProfileComponentRTK: React.FC<UserProfileComponentRTKProps> = ({
  username,
  directChatId,
  onClose,
  onMessage,
  onDeleteChat,
  hideMessageAction = false,
  onJumpToMessage,
  onOpenGroup,
  onEditProfile,
  hideBackOnMobile = false,
}) => {
  const { translations } = useLanguage();
  const { activeView, panelTransition, selectView: transitionToView } = useProfilePanelTransition(directChatId, username);
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [customNameInput, setCustomNameInput] = useState('');
  const [isEditingContactName, setIsEditingContactName] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isDeleteChatConfirmOpen, setIsDeleteChatConfirmOpen] = useState(false);
  const storedUser = useStoredValue<typeof fetchedUser>(username ? userByNameKey(username) : null);

  // Use username-based query instead of user ID
  const {
    data: fetchedUser,
    error,
    isLoading
  } = useGetUserByUsernameQuery(username);
  const userData = fetchedUser ?? storedUser;
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
    refetchOnMountOrArgChange: true,
  });
  const {
    data: chatAudiosData,
    isLoading: isLoadingDmAudios,
    error: dmAudiosQueryError,
  } = useGetChatAudiosQuery(directChatId || 0, {
    skip: !directChatId || !isPersistedId(directChatId),
  });
  const { data: chatFilesData, isLoading: isLoadingDmFiles, error: dmFilesQueryError } = useGetChatFilesQuery(directChatId || 0, {
    skip: !directChatId || !isPersistedId(directChatId),
  });
  const dmFiles = chatFilesData?.files ?? [];
  const linksQuery = useGetChatLinksQuery(directChatId || 0, { skip: !directChatId || !isPersistedId(directChatId) });
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
  const dmFilesError = dmFilesQueryError ? translations.errorLoadingMessages || translations.errorLoading || 'Error loading messages.' : null;
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
    return <UserProfileState isLoading={isLoading} unavailable={!!error || !userData} onClose={onClose} hideBackOnMobile={hideBackOnMobile} />;
  }

  const avatarUrl = getAvatarUrl(userData.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const displayName = profileDisplayName;
  const bio = userData.bio?.trim();
  const hasBlockedRelationship = isBlocked || userData.direct_message_reason === 'blocked';
  const canShowCreatedAt = !!userData.created_at && !hasBlockedRelationship;
  const canShowMessageAction = !hideMessageAction && !isCurrentUser && !!onMessage && (!!userData.can_message || !!userData.direct_chat_id);
  const canShowPhotosAction = !!directChatId && isPersistedId(directChatId) && dmPhotos.length > 0;
  const voiceItems = dmAudios.filter((item) => item.kind === 'voice');
  const audioFiles = dmAudios.filter((item) => item.kind !== 'voice');
  const canShowAudiosAction = !!directChatId && isPersistedId(directChatId) && audioFiles.length > 0;
  const canShowFilesAction = !!directChatId && isPersistedId(directChatId) && dmFiles.length > 0;
  const canShowDmSections = !!directChatId && isPersistedId(directChatId);
  const visiblePanelOrder: ProfilePanelView[] = [
    'details',
    ...(canShowPhotosAction ? (['photos'] as const) : []),
    ...(canShowAudiosAction ? (['audios'] as const) : []),
    ...(canShowFilesAction ? (['files'] as const) : []),
    ...(canShowDmSections && linksQuery.data?.length ? (['links'] as const) : []),
    ...(canShowDmSections && voiceItems.length ? (['voice'] as const) : []),
  ];
  const selectView = (view: ProfilePanelView) => transitionToView(view, visiblePanelOrder);

  const infoPanel = (
    <UserProfileInfoPanel
      userId={userData.id}
      actionError={actionError}
      isCurrentUser={isCurrentUser}
      onOpenGroup={onOpenGroup}
      bio={bio}
    />
  );

  const renderPanelContent = (view: ProfilePanelView) => (
    <UserProfilePanelView
      view={view} canShowPhotos={canShowPhotosAction} canShowAudios={canShowAudiosAction}
      canShowFiles={canShowFilesAction} files={dmFiles} isLoadingFiles={isLoadingDmFiles} filesError={dmFilesError}
      photos={dmPhotos} audios={audioFiles} voice={voiceItems} links={linksQuery.data} isLoadingLinks={linksQuery.isLoading}
      isLoadingPhotos={isLoadingDmPhotos} isLoadingAudios={isLoadingDmAudios}
      photosError={dmPhotosError} audiosError={dmAudiosError} infoPanel={infoPanel} currentUsername={currentUser?.username}
      onJumpToMessage={onJumpToMessage}
    />
  );

  return (
    <UserProfileShell onClose={onClose} hideBackOnMobile={hideBackOnMobile}>
      <div data-profile-swipe className="flex h-full min-h-0 flex-col">
        <UserProfileHero
          userId={userData.id} username={username} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar} displayName={displayName}
          isCurrentUser={isCurrentUser} isEditingContactName={isEditingContactName} customNameInput={customNameInput}
          setCustomNameInput={setCustomNameInput} onSaveContactName={handleSaveContactName}
          onCancelContactNameEdit={handleCancelContactNameEdit}
          onEditContactName={() => { setCustomNameInput(contactDisplayName || ''); setIsEditingContactName(true); }}
          isSavingContactName={isSavingContactName} accountDisplayName={accountDisplayName}
          isOnline={!!userData.is_online} lastSeen={userData.last_seen} onAvatarHistory={() => setIsAvatarViewerOpen(true)}
          bio={bio} createdAt={canShowCreatedAt ? userData.created_at ?? undefined : undefined} directChatId={canShowDmSections ? directChatId : undefined}
          canMessage={canShowMessageAction} isBlocked={isBlocked} canDeleteChat={!!onDeleteChat} tabs={visiblePanelOrder} activeView={activeView}
          onSelectView={selectView} onMessage={handleMessage} onDeleteChat={() => setIsDeleteChatConfirmOpen(true)}
          onBlock={isBlocked ? handleBlockToggle : () => setIsBlockConfirmOpen(true)} onEditProfile={onEditProfile}
        />

        <UserProfilePanelContent activeView={activeView} visibleViews={visiblePanelOrder} onSelectView={selectView}
          transition={panelTransition} renderPanelContent={renderPanelContent} />
      </div>
      <UserProfileConfirmations
        isBlockConfirmOpen={isBlockConfirmOpen} isDeleteChatConfirmOpen={isDeleteChatConfirmOpen}
        displayName={displayName} blockConsequences={blockUserConsequences} deleteConsequences={deleteChatConsequences}
        onCancelBlock={() => setIsBlockConfirmOpen(false)} onConfirmBlock={handleBlockToggle}
        onCancelDeleteChat={() => setIsDeleteChatConfirmOpen(false)}
        onConfirmDeleteChat={(scope) => { setIsDeleteChatConfirmOpen(false); onDeleteChat?.(scope); }}
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
