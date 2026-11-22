import { isPersistedId } from '@/shared/api/entityId';
import { useStoredValue, userByNameKey } from '@/shared/api/offlineStore';
import type { EntityId } from '@/shared/api/entityId';
import { asApiError } from '@/shared/lib/apiError';
import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useGetChatAudiosQuery, useGetChatFilesQuery, useGetChatLinksQuery, useGetChatPhotosQuery, useGetPinnedMessagesQuery } from '@/entities/message';
import { ProfilePinnedPanel, pinsEnabled } from '@/features/message-pins';
import {
  useGetUserByUsernameQuery, useUpdateContactDisplayNameMutation, useDeleteContactDisplayNameMutation,
  useGetBlockedUsersQuery,
} from '@/entities/user';
import AvatarHistoryViewer from './ui/AvatarHistoryViewer';
import UserProfileInfoPanel from './ui/UserProfileInfoPanel';
import UserProfileHero from './ui/UserProfileHero';
import { UserProfileShell, UserProfileState } from './ui/UserProfileShell';
import { PublicGroupFallback } from '@/features/sharing';
import UserProfilePanelContent, { ProfilePanelView } from './ui/UserProfilePanelContent';
import UserProfilePanelView from './ui/UserProfilePanelView';
import { useProfilePanelTransition } from './useProfilePanelTransition';
import { toProfileAudios, toProfilePhotos } from '@/entities/message';
import { isBirthdayToday } from '@/shared/ui/profile/birthday';

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
  onChatDeleted?: () => void;
  hideMessageAction?: boolean;
  onJumpToMessage?: (messageId: EntityId, chatId: EntityId) => void;
  onOpenGroup?: (group: { id: EntityId; name: string; avatarUrl?: string }) => void;
  onEditProfile?: () => void;
  hideBackOnMobile?: boolean;
  hideBack?: boolean;
}

const UserProfileComponentRTK: React.FC<UserProfileComponentRTKProps> = ({
  username,
  directChatId,
  onClose,
  onMessage,
  onChatDeleted,
  hideMessageAction = false,
  onJumpToMessage,
  onOpenGroup,
  onEditProfile,
  hideBackOnMobile = false,
  hideBack = false,
}) => {
  const { translations } = useLanguage();
  const { activeView, panelTransition, selectView: transitionToView } = useProfilePanelTransition(directChatId, username);
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [customNameInput, setCustomNameInput] = useState('');
  const [isEditingContactName, setIsEditingContactName] = useState(false);
  const storedUser = useStoredValue<typeof fetchedUser>(username ? userByNameKey(username) : null);

  // Use username-based query instead of user ID
  const {
    data: fetchedUser,
    error,
    isLoading
  } = useGetUserByUsernameQuery(username);
  const userData = fetchedUser ?? storedUser;
  const chatId = directChatId ?? userData?.direct_chat_id ?? undefined;
  const { data: currentUser } = useGetCurrentUserQuery();
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const [updateContactDisplayName, { isLoading: isUpdatingContactName }] = useUpdateContactDisplayNameMutation();
  const [deleteContactDisplayName, { isLoading: isDeletingContactName }] = useDeleteContactDisplayNameMutation();
  const isSavingContactName = isUpdatingContactName || isDeletingContactName;
  const {
    data: chatPhotosData,
    isLoading: isLoadingDmPhotos,
    error: dmPhotosQueryError,
  } = useGetChatPhotosQuery(chatId || 0, {
    skip: !chatId || !isPersistedId(chatId),
    refetchOnMountOrArgChange: true,
  });
  const {
    data: chatAudiosData,
    isLoading: isLoadingDmAudios,
    error: dmAudiosQueryError,
  } = useGetChatAudiosQuery(chatId || 0, {
    skip: !chatId || !isPersistedId(chatId),
  });
  const { data: chatFilesData, isLoading: isLoadingDmFiles, error: dmFilesQueryError } = useGetChatFilesQuery(chatId || 0, {
    skip: !chatId || !isPersistedId(chatId),
  });
  const dmFiles = chatFilesData?.files ?? [];
  const linksQuery = useGetChatLinksQuery(chatId || 0, { skip: !chatId || !isPersistedId(chatId) });
  const { data: pinnedData } = useGetPinnedMessagesQuery(chatId || 0, { skip: !chatId || !pinsEnabled(chatId) });
  const profileDisplayName = userData?.display_name || username;
  const accountDisplayName = userData?.account_display_name || username;
  const contactDisplayName = userData?.contact_display_name?.trim();
  const isBlocked = !!blockedUsersData?.users?.some((blockedUser) => blockedUser.username === username);
  const isCurrentUser = currentUser?.username === username;
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

  useEffect(() => { setActionError(null); }, [chatId, username]);

  useEffect(() => {
    setCustomNameInput(userData?.contact_display_name || '');
    setIsEditingContactName(false);
  }, [userData?.contact_display_name, username]);

  const getAvatarUrl = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl);

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
    const state = (
      <UserProfileState isLoading={isLoading} unavailable={!!error || !userData} onClose={onClose}
        hideBackOnMobile={hideBackOnMobile} hideBack={hideBack} />
    );
    if (isLoading) return state;
    return (
      <PublicGroupFallback name={username} fallback={state}
        frame={(card) => <UserProfileShell onClose={onClose} hideBackOnMobile={hideBackOnMobile} hideBack={hideBack}>{card}</UserProfileShell>} />
    );
  }

  const avatarUrl = getAvatarUrl(userData.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const displayName = profileDisplayName;
  const bio = userData.bio?.trim();
  const hasBlockedRelationship = isBlocked || userData.direct_message_reason === 'blocked';
  const canShowCreatedAt = !!userData.created_at && !hasBlockedRelationship;
  const canShowMessageAction = !hideMessageAction && !isCurrentUser && !!onMessage && (!!userData.can_message || !!userData.direct_chat_id);
  const canShowPhotosAction = !!chatId && isPersistedId(chatId) && dmPhotos.length > 0;
  const voiceItems = dmAudios.filter((item) => item.kind === 'voice');
  const audioFiles = dmAudios.filter((item) => item.kind !== 'voice');
  const canShowAudiosAction = !!chatId && isPersistedId(chatId) && audioFiles.length > 0;
  const canShowFilesAction = !!chatId && isPersistedId(chatId) && dmFiles.length > 0;
  const canShowDmSections = !!chatId && isPersistedId(chatId);
  const visiblePanelOrder: ProfilePanelView[] = [
    'details',
    ...(canShowDmSections && pinnedData?.items.length ? (['pinned'] as const) : []),
    ...(canShowPhotosAction ? (['photos'] as const) : []),
    ...(canShowAudiosAction ? (['audios'] as const) : []),
    ...(canShowFilesAction ? (['files'] as const) : []),
    ...(canShowDmSections && linksQuery.data?.length ? (['links'] as const) : []),
    ...(canShowDmSections && voiceItems.length ? (['voice'] as const) : []),
  ];
  const selectView = (view: ProfilePanelView) => transitionToView(view, visiblePanelOrder);
  const jumpToMessage = onJumpToMessage && chatId ? (messageId: EntityId) => onJumpToMessage(messageId, chatId) : undefined;

  const infoPanel = (
    <UserProfileInfoPanel
      userId={userData.id}
      actionError={actionError}
      isCurrentUser={isCurrentUser}
      onOpenGroup={onOpenGroup}
      bio={bio}
      birthday={userData.birthday}
      music={userData.music}
      ownerName={displayName}
    />
  );

  const renderPanelContent = (view: ProfilePanelView) => (
    <UserProfilePanelView
      view={view} canShowPhotos={canShowPhotosAction} canShowAudios={canShowAudiosAction}
      canShowFiles={canShowFilesAction} files={dmFiles} isLoadingFiles={isLoadingDmFiles} filesError={dmFilesError}
      photos={dmPhotos} audios={audioFiles} voice={voiceItems} links={linksQuery.data} isLoadingLinks={linksQuery.isLoading}
      isLoadingPhotos={isLoadingDmPhotos} isLoadingAudios={isLoadingDmAudios}
      photosError={dmPhotosError} audiosError={dmAudiosError} infoPanel={infoPanel} currentUsername={currentUser?.username}
      onJumpToMessage={jumpToMessage}
      pinned={canShowDmSections && chatId ? <ProfilePinnedPanel chatId={chatId} onJumpToMessage={jumpToMessage} /> : undefined}
    />
  );

  return (
    <UserProfileShell onClose={onClose} hideBackOnMobile={hideBackOnMobile} hideBack={hideBack} background={userData.background}>
      <div data-profile-swipe className="flex h-full min-h-0 flex-col">
        <UserProfileHero
          userId={userData.id} username={username} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar} displayName={displayName}
          isCurrentUser={isCurrentUser} isEditingContactName={isEditingContactName} customNameInput={customNameInput}
          setCustomNameInput={setCustomNameInput} onSaveContactName={handleSaveContactName}
          onCancelContactNameEdit={handleCancelContactNameEdit}
          onEditContactName={() => { setCustomNameInput(contactDisplayName || ''); setIsEditingContactName(true); }}
          isSavingContactName={isSavingContactName} accountDisplayName={accountDisplayName}
          isOnline={!!userData.is_online} lastSeen={userData.last_seen} onAvatarHistory={() => setIsAvatarViewerOpen(true)}
          bio={bio} createdAt={canShowCreatedAt ? userData.created_at ?? undefined : undefined} directChatId={canShowDmSections ? chatId : undefined}
          canMessage={canShowMessageAction} isBlocked={isBlocked} tabs={visiblePanelOrder} activeView={activeView}
          onSelectView={selectView} onMessage={handleMessage} onChatDeleted={onChatDeleted} onEditProfile={onEditProfile}
          pronouns={userData.pronouns} background={userData.background} birthdayToday={isBirthdayToday(userData.birthday)}
          accountLabel={userData.account_label}
        />

        <UserProfilePanelContent activeView={activeView} visibleViews={visiblePanelOrder} onSelectView={selectView}
          transition={panelTransition} renderPanelContent={renderPanelContent} />
      </div>
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
