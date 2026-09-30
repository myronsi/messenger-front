import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGetChatAudiosQuery, useGetChatPhotosQuery, useGetOneOnOneChatsQuery } from '@/app/api/messengerApi';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ProfileAudiosPanel, ProfilePhotosPanel, ProfileSearchPanel, toProfileAudios, toProfilePhotos } from '@/widgets/profile-panel/ui/ProfileChatPanels';
import type { GroupProfileDialogProps, GroupParticipant, GroupPendingInvite, GroupProfileView, GroupProfileTransition } from './GroupProfileTypes';
import GroupProfileDetailsPanel from './GroupProfileDetailsPanel';
import GroupParticipantsPanel from './GroupParticipantsPanel';
import GroupProfileDialogShell from './GroupProfileDialogShell';
export type { GroupRole, GroupParticipant, GroupPendingInvite, GroupPermissions, GroupDetails, GroupProfileConfirmState } from './GroupProfileTypes';

const emptyParticipants: GroupParticipant[] = [];
const emptyPendingInvites: GroupPendingInvite[] = [];

const GroupProfileDialog: React.FC<GroupProfileDialogProps> = (model) => {
  const { open, isClosing, onOpenChange, chatId, groupDetails, currentGroupName, currentGroupAvatar, groupForm, participantInput, currentUsername, onJumpToMessage, groupConfirm, onCloseGroupConfirm } = model;
  const { translations } = useLanguage();
  const [activeView, setActiveView] = useState<GroupProfileView>('details');
  const [panelTransition, setPanelTransition] = useState<GroupProfileTransition | null>(null);
  const [isDmContactsCollapsed, setIsDmContactsCollapsed] = useState(true);
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const panelTransitionTimeoutRef = useRef<number | null>(null);
  const {
    data: chatPhotosData,
    isLoading: isLoadingPhotos,
    error: photosQueryError,
  } = useGetChatPhotosQuery(chatId, {
    skip: !open || chatId <= 0,
  });
  const {
    data: chatAudiosData,
    isLoading: isLoadingAudios,
    error: audiosQueryError,
  } = useGetChatAudiosQuery(chatId, {
    skip: !open || chatId <= 0,
  });
  useEffect(() => {
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
  const canShowPhotosAction = photos.length > 0;
  const canShowAudiosAction = audios.length > 0;
  const visiblePanelOrder: GroupProfileView[] = [
    'details',
    'participants',
    'search',
    ...(canShowPhotosAction ? (['photos'] as const) : []),
    ...(canShowAudiosAction ? (['audios'] as const) : []),
  ];
  const actionColumns = Math.min(visiblePanelOrder.length, 5);
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

  const handleJumpToMessage = (messageId: number) => {
    onOpenChange(false);
    onJumpToMessage(messageId);
  };

  const renderPanelContent = (view: GroupProfileView, options: { autoFocusSearch?: boolean } = {}) => {
    if (view === 'search') {
      return (
        <ProfileSearchPanel
          chatId={chatId}
          onJumpToMessage={handleJumpToMessage}
          autoFocus={options.autoFocusSearch !== false}
        />
      );
    }
    if (view === 'photos' && canShowPhotosAction) {
      return <ProfilePhotosPanel photos={photos} isLoading={isLoadingPhotos} error={photosError} />;
    }
    if (view === 'audios' && canShowAudiosAction) {
      return <ProfileAudiosPanel audios={audios} isLoading={isLoadingAudios} error={audiosError} />;
    }
    if (view === 'participants') {
      return <GroupParticipantsPanel model={model} canManage={canManage} canAssignRoles={canAssignRoles} canTransferOwnership={canTransferOwnership} isDmContactsCollapsed={isDmContactsCollapsed} setIsDmContactsCollapsed={setIsDmContactsCollapsed} dmContactSuggestions={dmContactSuggestions} sortedParticipants={sortedParticipants} pendingInvites={pendingInvites} />;
    }
    return <GroupProfileDetailsPanel model={model} canEdit={canEdit} canDeleteGroup={canDeleteGroup} hasGroupChanges={hasGroupChanges} currentRole={currentRole} participants={participants} pendingInvites={pendingInvites} />;
  };

  return <GroupProfileDialogShell
    open={open} isClosing={isClosing} onOpenChange={onOpenChange}
    currentGroupName={currentGroupName} currentGroupAvatar={currentGroupAvatar}
    participants={participants} actionColumns={actionColumns}
    canShowPhotosAction={canShowPhotosAction} canShowAudiosAction={canShowAudiosAction}
    activeView={activeView} panelTransition={panelTransition} onSelectView={selectView}
    renderPanelContent={renderPanelContent} groupConfirm={groupConfirm}
    onCloseGroupConfirm={onCloseGroupConfirm} isAvatarViewerOpen={isAvatarViewerOpen}
    setIsAvatarViewerOpen={setIsAvatarViewerOpen}
  />;

};

export default GroupProfileDialog;
