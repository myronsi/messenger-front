import { isPersistedId } from '@/shared/api/entityId';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGetChatAudiosQuery, useGetChatFilesQuery, useGetChatLinksQuery, useGetChatPhotosQuery, ProfileLinksPanel } from '@/entities/message';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useBackToClose } from '@/shared/lib/useBackToClose';
import { useDelayedUnmount } from '@/shared/lib/useDelayedUnmount';
import { WINDOW_MOTION_MS } from '@/shared/ui/windowMotion';
import { ProfileAudiosPanel, ProfileFilesPanel, ProfilePhotosPanel, toProfileAudios, toProfilePhotos } from '@/entities/message';
import type { GroupProfileDialogProps, GroupParticipant, GroupPendingInvite, GroupProfileView, GroupProfileTransition } from './GroupProfileTypes';
import GroupProfileDetailsPanel from './GroupProfileDetailsPanel';
import GroupParticipantsPanel from './GroupParticipantsPanel';
import GroupProfileDialogShell from './GroupProfileDialogShell';
import GroupRoleHistoryPage from './GroupRoleHistoryPage';
export type { GroupRole, GroupParticipant, GroupPendingInvite, GroupPermissions, GroupDetails, GroupProfileConfirmState } from './GroupProfileTypes';

const emptyParticipants: GroupParticipant[] = [];
const emptyPendingInvites: GroupPendingInvite[] = [];

const GroupProfileDialog: React.FC<GroupProfileDialogProps> = (model) => {
  const {
    open, isClosing, onOpenChange, chatId, groupDetails, currentGroupName, currentGroupAvatar, groupForm,
    participantInput, currentUsername, groupConfirm, onCloseGroupConfirm,
  } = model;
  const { translations } = useLanguage();
  const [activeView, setActiveView] = useState<GroupProfileView>('details');
  const [panelTransition, setPanelTransition] = useState<GroupProfileTransition | null>(null);
  const [isDmContactsCollapsed, setIsDmContactsCollapsed] = useState(true);
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const [isRoleHistoryOpen, setIsRoleHistoryOpen] = useState(false);
  useBackToClose(open && isRoleHistoryOpen, () => setIsRoleHistoryOpen(false), 'groupRoleHistory');
  const roleHistoryPage = useDelayedUnmount(isRoleHistoryOpen, WINDOW_MOTION_MS);
  const panelTransitionTimeoutRef = useRef<number | null>(null);
  const {
    data: chatPhotosData,
    isLoading: isLoadingPhotos,
    error: photosQueryError,
  } = useGetChatPhotosQuery(chatId, {
    skip: !open || !isPersistedId(chatId),
    refetchOnMountOrArgChange: true,
  });
  const {
    data: chatAudiosData,
    isLoading: isLoadingAudios,
    error: audiosQueryError,
  } = useGetChatAudiosQuery(chatId, {
    skip: !open || !isPersistedId(chatId),
  });
  const { data: chatFilesData, isLoading: isLoadingFiles, error: filesQueryError } = useGetChatFilesQuery(chatId, {
    skip: !open || !isPersistedId(chatId),
  });
  const files = chatFilesData?.files ?? [];
  const linksQuery = useGetChatLinksQuery(chatId, { skip: !open || !isPersistedId(chatId) });
  useEffect(() => {
    setIsRoleHistoryOpen(false);
    if (!open) return;
    setActiveView('details');
    setPanelTransition(null);
    setIsDmContactsCollapsed(true);
    setIsAvatarViewerOpen(false);
  }, [chatId, open]);

  useEffect(() => {
    return () => {
      if (panelTransitionTimeoutRef.current !== null) {
        window.clearTimeout(panelTransitionTimeoutRef.current);
      }
    };
  }, []);

  const photos = useMemo(() => (
    toProfilePhotos(chatPhotosData?.photos || [], translations.photoMessage || 'Photo')
  ), [chatPhotosData?.photos, translations.photoMessage]);
  const audios = useMemo(() => (
    toProfileAudios(chatAudiosData?.audios || [], translations.audioFile || 'Audio')
  ), [chatAudiosData?.audios, translations.audioFile]);

  const permissions = groupDetails?.permissions;
  const canEdit = !!permissions?.can_edit_group;
  const canManage = !!permissions?.can_manage_participants;
  const canAssignRoles = !!permissions?.can_assign_roles;
  const canTransferOwnership = !!permissions?.can_transfer_ownership;
  const canDeleteGroup = !!permissions?.can_delete_group;
  const { data: dmChatsData } = useGetOneOnOneChatsQuery(currentUsername, {
    skip: !open || !canManage || !currentUsername,
  });
  const participants = groupDetails?.participants ?? emptyParticipants;
  const pendingInvites = groupDetails?.pending_invites ?? emptyPendingInvites;
  const sortedParticipants = useMemo(() => {
    const currentUsernameKey = currentUsername.toLowerCase();
    return [...participants].sort((a, b) => {
      const aIsMe = a.username.toLowerCase() === currentUsernameKey;
      const bIsMe = b.username.toLowerCase() === currentUsernameKey;
      if (aIsMe !== bIsMe) return aIsMe ? -1 : 1;
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (b.role === 'owner' && a.role !== 'owner') return 1;
      return (a.display_name || a.username).localeCompare(b.display_name || b.username, undefined, { sensitivity: 'base' });
    });
  }, [currentUsername, participants]);
  const participantUsernameSet = useMemo(() => (
    new Set([
      ...participants.map((participant) => participant.username.toLowerCase()),
      ...pendingInvites.map((invite) => invite.username.toLowerCase()),
    ])
  ), [participants, pendingInvites]);
  const dmContactSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const query = participantInput.trim().toLowerCase();
    return (dmChatsData?.chats || [])
      .filter((chat) => !chat.interlocutor_deleted && !!chat.interlocutor_name)
      .map((chat) => ({
        username: chat.interlocutor_name,
        display_name: chat.interlocutor_display_name || chat.interlocutor_name,
        avatar_url: chat.avatar_url,
      }))
      .filter((contact) => {
        const usernameKey = contact.username.toLowerCase();
        if (usernameKey === currentUsername.toLowerCase()) return false;
        if (participantUsernameSet.has(usernameKey)) return false;
        if (seen.has(usernameKey)) return false;
        seen.add(usernameKey);
        if (!query) return true;
        return usernameKey.includes(query) || (contact.display_name || '').toLowerCase().includes(query);
      })
      .slice(0, 6);
  }, [currentUsername, dmChatsData?.chats, participantInput, participantUsernameSet]);
  const currentRole = groupDetails?.current_user_role || 'member';
  const mediaError = translations.errorLoadingMessages || translations.errorLoading || 'Error loading messages.';
  const photosError = photosQueryError ? mediaError : null;
  const audiosError = audiosQueryError ? mediaError : null;
  const filesError = filesQueryError ? mediaError : null;
  const canShowPhotosAction = photos.length > 0;
  const voiceItems = audios.filter((item) => item.kind === 'voice');
  const audioFiles = audios.filter((item) => item.kind !== 'voice');
  const canShowAudiosAction = audioFiles.length > 0;
  const canShowFilesAction = files.length > 0;
  const visiblePanelOrder: GroupProfileView[] = [
    'details',
    'participants',
    ...(canShowPhotosAction ? (['photos'] as const) : []),
    ...(canShowAudiosAction ? (['audios'] as const) : []),
    ...(canShowFilesAction ? (['files'] as const) : []),
    ...(linksQuery.data?.length ? (['links'] as const) : []),
    ...(voiceItems.length ? (['voice'] as const) : []),
  ];
  const canMute = isPersistedId(chatId);
  const hasGroupChanges = groupForm.name.trim() !== currentGroupName || groupForm.description.trim() !== (groupDetails?.description || '');

  const selectView = (view: GroupProfileView) => {
    if (view === activeView) return;
    const currentIndex = visiblePanelOrder.indexOf(activeView);
    const nextIndex = visiblePanelOrder.indexOf(view);
    const direction = nextIndex > currentIndex ? 'forward' : 'back';

    if (panelTransitionTimeoutRef.current !== null) {
      window.clearTimeout(panelTransitionTimeoutRef.current);
    }

    setPanelTransition({ from: activeView, to: view, direction, key: Date.now() });
    setActiveView(view);
    panelTransitionTimeoutRef.current = window.setTimeout(() => {
      setPanelTransition(null);
      panelTransitionTimeoutRef.current = null;
    }, 340);
  };

  const renderPanelContent = (view: GroupProfileView) => {
    if (view === 'photos' && canShowPhotosAction) {
      return (
        <ProfilePhotosPanel
          photos={photos} isLoading={isLoadingPhotos} error={photosError} currentUsername={currentUsername} onJumpToMessage={model.onJumpToMessage}
        />
      );
    }
    if (view === 'links') return <ProfileLinksPanel links={linksQuery.data ?? []} isLoading={linksQuery.isLoading} onJumpToMessage={model.onJumpToMessage} />;
    if ((view === 'audios' && canShowAudiosAction) || view === 'voice') {
      return (
        <ProfileAudiosPanel
          audios={view === 'voice' ? voiceItems : audioFiles} isLoading={isLoadingAudios} error={audiosError} currentUsername={currentUsername} onJumpToMessage={model.onJumpToMessage}
        />
      );
    }
    if (view === 'files' && canShowFilesAction) {
      return (
        <ProfileFilesPanel files={files} isLoading={isLoadingFiles} error={filesError}
          currentUsername={currentUsername} onJumpToMessage={model.onJumpToMessage} />
      );
    }
    if (view === 'participants') {
      return (
        <GroupParticipantsPanel
          model={model} canManage={canManage} canAssignRoles={canAssignRoles} canTransferOwnership={canTransferOwnership}
          isDmContactsCollapsed={isDmContactsCollapsed} setIsDmContactsCollapsed={setIsDmContactsCollapsed}
          dmContactSuggestions={dmContactSuggestions} sortedParticipants={sortedParticipants} pendingInvites={pendingInvites}
        />
      );
    }
    return (
      <GroupProfileDetailsPanel
        model={model} canEdit={canEdit} canDeleteGroup={canDeleteGroup} hasGroupChanges={hasGroupChanges}
        currentRole={currentRole} participants={participants} pendingInvites={pendingInvites}
        onOpenRoleHistory={() => setIsRoleHistoryOpen(true)}
      />
    );
  };

  return <GroupProfileDialogShell
    chatId={chatId} canMute={canMute}
    open={open} isClosing={isClosing} onOpenChange={onOpenChange}
    currentGroupName={currentGroupName} currentGroupAvatar={currentGroupAvatar}
    participants={participants} visibleViews={visiblePanelOrder} description={groupDetails?.description} currentRole={currentRole}
    canShowPhotosAction={canShowPhotosAction} canShowAudiosAction={canShowAudiosAction} canShowFilesAction={canShowFilesAction}
    activeView={activeView} panelTransition={panelTransition} onSelectView={selectView}
    renderPanelContent={renderPanelContent} groupConfirm={groupConfirm}
    onCloseGroupConfirm={onCloseGroupConfirm} isAvatarViewerOpen={isAvatarViewerOpen}
    setIsAvatarViewerOpen={setIsAvatarViewerOpen}
    subPage={roleHistoryPage.mounted ? (
      <GroupRoleHistoryPage chatId={chatId} rolesKey={participants.map((participant) => `${participant.id}:${participant.role}`).join(',')}
        onBack={() => setIsRoleHistoryOpen(false)} closing={roleHistoryPage.closing} />
    ) : null}
  />;

};

export default GroupProfileDialog;
