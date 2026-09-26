import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ChevronDown, Crown, Download, Image as ImageIcon, ImageOff, Loader2, LogOut, MoreVertical, Music, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useGetChatAudiosQuery, useGetChatPhotosQuery, useGetOneOnOneChatsQuery } from '@/app/api/messengerApi';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  ProfileAudiosPanel,
  ProfilePhotosPanel,
  ProfileSearchPanel,
  toProfileAudios,
  toProfilePhotos,
} from '@/widgets/profile-panel/ui/ProfileChatPanels';

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface GroupParticipant {
  id: number;
  username: string;
  display_name?: string;
  avatar_url: string;
  role: GroupRole;
  is_owner?: boolean;
  is_admin?: boolean;
}

export interface GroupPendingInvite {
  request_id: number;
  id: number;
  username: string;
  display_name?: string;
  avatar_url: string;
  status: 'pending';
}

export interface GroupPermissions {
  can_edit_group: boolean;
  can_manage_participants: boolean;
  can_assign_roles: boolean;
  can_delete_any_message: boolean;
  can_delete_group: boolean;
  can_transfer_ownership: boolean;
}

export interface GroupDetails {
  chat_id: number;
  name: string;
  description: string;
  avatar_url: string;
  owner_id: number;
  owner_username: string;
  admin_id?: number;
  admin_username?: string;
  current_user_role?: GroupRole | null;
  permissions: GroupPermissions;
  participants: GroupParticipant[];
  pending_invites?: GroupPendingInvite[];
}

type GroupProfileView = 'details' | 'participants' | 'search' | 'photos' | 'audios';
type GroupProfileTransition = {
  from: GroupProfileView;
  to: GroupProfileView;
  direction: 'forward' | 'back';
  key: number;
};

interface GroupAvatarViewerProps {
  avatarUrl: string;
  groupName: string;
  onClose: () => void;
}

const GroupAvatarViewer: React.FC<GroupAvatarViewerProps> = ({ avatarUrl, groupName, onClose }) => {
  const { translations } = useLanguage();
  const [isBroken, setIsBroken] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!avatarUrl || isBroken) return;
    const extension = avatarUrl.split('?')[0].split('.').pop() || 'jpg';
    const safeName = groupName.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'group';
    const filename = `${safeName}-avatar.${extension}`;

    try {
      const response = await fetch(avatarUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      const link = document.createElement('a');
      link.href = avatarUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [avatarUrl, groupName, isBroken]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="motion-avatar-viewer-backdrop absolute inset-0 z-[120] flex items-center justify-center bg-black/80 px-4 py-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {!isBroken && (
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={translations.download || 'Download'}
            title={translations.download || 'Download'}
          >
            <Download className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Close avatar viewer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="motion-panel-in relative flex max-h-full w-full flex-col items-center">
        <div className="relative flex min-h-[260px] w-full items-center justify-center rounded-lg bg-black/30 p-4">
          {isBroken ? (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <ImageOff className="h-10 w-10" />
              <span className="text-sm">{translations.failedToLoadImage || 'Failed to load image'}</span>
            </div>
          ) : (
            <img
              src={avatarUrl}
              alt={`${groupName} avatar`}
              className="motion-avatar-viewer-image max-h-[62vh] max-w-full rounded-lg object-contain"
              onError={() => setIsBroken(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export type GroupProfileConfirmState = {
  title: string;
  message: string;
  consequences?: string[];
  confirmText?: string;
  isDestructive?: boolean;
  isError?: boolean;
  onConfirm: () => void;
};

interface GroupProfileDialogProps {
  open: boolean;
  isClosing: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: number;
  groupDetails: GroupDetails | null;
  currentGroupName: string;
  currentGroupAvatar: string;
  groupForm: { name: string; description: string };
  setGroupForm: React.Dispatch<React.SetStateAction<{ name: string; description: string }>>;
  participantInput: string;
  setParticipantInput: (value: string) => void;
  isSavingGroup: boolean;
  currentUsername: string;
  groupAvatarInputRef: React.RefObject<HTMLInputElement>;
  getAvatarSrc: (avatarUrl?: string | null) => string;
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveGroup: () => void;
  onAddParticipant: (usernameOverride?: string) => void;
  onRemoveParticipant: (username: string) => void;
  onRoleChange: (username: string, role: GroupRole) => void;
  onTransferOwner: (username: string) => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  onOpenUserProfile: (username: string) => void;
  onJumpToMessage: (messageId: number) => void;
  groupConfirm: GroupProfileConfirmState | null;
  onCloseGroupConfirm: () => void;
}

const roleLabel = (role: GroupRole, translations: any) => {
  if (role === 'owner') return translations.owner || 'Owner';
  if (role === 'admin') return translations.admin || 'Admin';
  if (role === 'moderator') return translations.moderator || 'Moderator';
  return translations.member || 'Member';
};

const roleTone = (role: GroupRole) => {
  if (role === 'owner') return 'bg-amber-100 text-amber-900';
  if (role === 'admin') return 'bg-blue-100 text-blue-900';
  if (role === 'moderator') return 'bg-emerald-100 text-emerald-900';
  return 'bg-gray-100 text-gray-600';
};

const GroupProfileDialog: React.FC<GroupProfileDialogProps> = ({
  open,
  isClosing,
  onOpenChange,
  chatId,
  groupDetails,
  currentGroupName,
  currentGroupAvatar,
  groupForm,
  setGroupForm,
  participantInput,
  setParticipantInput,
  isSavingGroup,
  currentUsername,
  groupAvatarInputRef,
  getAvatarSrc,
  onAvatarUpload,
  onSaveGroup,
  onAddParticipant,
  onRemoveParticipant,
  onRoleChange,
  onTransferOwner,
  onLeaveGroup,
  onDeleteGroup,
  onOpenUserProfile,
  onJumpToMessage,
  groupConfirm,
  onCloseGroupConfirm,
}) => {
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
  const participants = groupDetails?.participants || [];
  const pendingInvites = groupDetails?.pending_invites || [];
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

  const renderParticipant = (participant: GroupParticipant) => {
    const isOwner = participant.role === 'owner';
    const isCurrentUser = participant.username === currentUsername;
    return (
      <div key={participant.id} className="flex items-center gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0">
        <button type="button" onClick={() => onOpenUserProfile(participant.username)} className="shrink-0 rounded-full">
          <img src={getAvatarSrc(participant.avatar_url)} alt={participant.username} className="h-10 w-10 rounded-full object-cover" />
        </button>
        <button type="button" onClick={() => onOpenUserProfile(participant.username)} className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-gray-900">{participant.display_name || participant.username}</span>
            {isCurrentUser && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium leading-none text-primary">
                {translations.me || 'Me'}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-gray-500">@{participant.username}</div>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {isOwner ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
              <Crown className="h-3 w-3" />
              {roleLabel('owner', translations)}
            </span>
          ) : canAssignRoles ? (
            <Select
              value={participant.role}
              onValueChange={(value) => onRoleChange(participant.username, value as GroupRole)}
            >
              <SelectTrigger className="h-8 w-32 px-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1300]">
                <SelectItem value="member">{roleLabel('member', translations)}</SelectItem>
                <SelectItem value="moderator">{roleLabel('moderator', translations)}</SelectItem>
                <SelectItem value="admin">{roleLabel('admin', translations)}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${roleTone(participant.role)}`}>
              {roleLabel(participant.role, translations)}
            </span>
          )}
          {((canTransferOwnership && !isOwner) || (canManage && !isOwner && !isCurrentUser)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  aria-label={translations.actions || 'Actions'}
                  title={translations.actions || 'Actions'}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[1300] w-48">
                {canTransferOwnership && !isOwner && (
                  <DropdownMenuItem onClick={() => onTransferOwner(participant.username)} className="gap-2">
                    <Crown className="h-4 w-4 text-amber-700" />
                    {translations.transferOwnership || 'Transfer ownership'}
                  </DropdownMenuItem>
                )}
                {canTransferOwnership && canManage && !isOwner && !isCurrentUser && <DropdownMenuSeparator />}
                {canManage && !isOwner && !isCurrentUser && (
                  <DropdownMenuItem
                    onClick={() => onRemoveParticipant(participant.username)}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {translations.removeParticipant || 'Remove participant'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  const renderPendingInvite = (invite: GroupPendingInvite) => (
    <div key={`pending-${invite.request_id}`} className="flex items-center gap-3 border-b border-gray-200 bg-amber-50/50 px-3 py-3 last:border-b-0">
      <button type="button" onClick={() => onOpenUserProfile(invite.username)} className="shrink-0 rounded-full">
        <img src={getAvatarSrc(invite.avatar_url)} alt={invite.username} className="h-10 w-10 rounded-full object-cover opacity-80" />
      </button>
      <button type="button" onClick={() => onOpenUserProfile(invite.username)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-medium text-gray-900">{invite.display_name || invite.username}</div>
        <div className="truncate text-xs text-gray-500">@{invite.username}</div>
      </button>
      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
        {translations.pending || 'Pending'}
      </span>
    </div>
  );

  const detailsPanel = (
    <div className="min-h-full space-y-3 px-5 py-4 md:py-3">
      <section className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img src={currentGroupAvatar} alt={currentGroupName} className="h-16 w-16 rounded-full border border-gray-200 object-cover" />
            {canEdit && (
              <button
                type="button"
                onClick={() => groupAvatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-gray-900 text-white shadow-sm transition-colors hover:bg-gray-700"
                aria-label={translations.changeAvatar || 'Change avatar'}
                title={translations.changeAvatar || 'Change avatar'}
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-500">{translations.yourRole || 'Your role'}</div>
            <div className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {roleLabel(currentRole, translations)}
            </div>
          </div>
          <input ref={groupAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
        </div>
      </section>

      {canEdit ? (
        <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.groupName || 'Group name'}</label>
            <input
              value={groupForm.name}
              onChange={(event) => setGroupForm((form) => ({ ...form, name: event.target.value }))}
              placeholder={translations.groupName || 'Group name'}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.bio || translations.groupDescription || 'Description'}</label>
            <textarea
              value={groupForm.description}
              onChange={(event) => setGroupForm((form) => ({ ...form, description: event.target.value }))}
              placeholder={translations.groupDescription || 'Group description'}
              rows={4}
              className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={onSaveGroup}
            disabled={isSavingGroup || !groupForm.name.trim() || !hasGroupChanges}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {translations.save || 'Save'}
          </button>
        </section>
      ) : (
        <>
          {groupDetails?.description && (
            <section className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {translations.bio || translations.groupDescription || 'Description'}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-5 text-gray-900">{groupDetails.description}</p>
            </section>
          )}
        </>
      )}

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.group || 'Group'}</div>
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500">{translations.participants || 'Participants'}</span>
            <span className="font-medium text-gray-900">{participants.length + pendingInvites.length}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500">{translations.owner || 'Owner'}</span>
            <span className="min-w-0 truncate font-medium text-gray-900">@{groupDetails?.owner_username || groupDetails?.admin_username || '-'}</span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onLeaveGroup}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        {translations.leaveGroup || 'Leave group'}
      </button>

      {canDeleteGroup && (
        <button
          type="button"
          onClick={onDeleteGroup}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          <Trash2 className="h-4 w-4" />
          {translations.deleteGroup || 'Delete group'}
        </button>
      )}
    </div>
  );

  const participantsPanel = (
    <div className="min-h-full space-y-3 px-5 py-4 md:py-3">
      {canManage && (
        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            {translations.addParticipant || 'Add participant'}
          </div>
          <div className="flex gap-2">
            <input
              value={participantInput}
              onChange={(event) => setParticipantInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onAddParticipant()}
              placeholder={translations.enterUsername || 'Enter username'}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => onAddParticipant()}
              disabled={!participantInput.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={translations.addParticipant || 'Add participant'}
              title={translations.addParticipant || 'Add participant'}
            >
              <UserPlus className="h-4 w-4" />
            </button>
          </div>
          {dmContactSuggestions.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-md border border-dashed border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsDmContactsCollapsed((collapsed) => !collapsed)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                aria-expanded={!isDmContactsCollapsed}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-800">
                    {translations.directMessages || 'Direct messages'}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {dmContactSuggestions.length} {translations.available || 'available'}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${isDmContactsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
              </button>
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isDmContactsCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                <div className="min-h-0 overflow-hidden">
                  <div className="max-h-44 overflow-y-auto border-t border-gray-200 p-1">
                    {dmContactSuggestions.map((contact) => (
                      <button
                        key={contact.username}
                        type="button"
                        onClick={() => onAddParticipant(contact.username)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-white"
                      >
                        <img src={getAvatarSrc(contact.avatar_url)} alt={contact.username} className="h-8 w-8 rounded-full object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-gray-900">{contact.display_name}</span>
                          <span className="block truncate text-xs text-gray-500">@{contact.username}</span>
                        </span>
                        <UserPlus className="h-4 w-4 text-gray-500" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {sortedParticipants.length + pendingInvites.length > 0 ? (
          <>
            {sortedParticipants.map(renderParticipant)}
            {pendingInvites.map(renderPendingInvite)}
          </>
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500">{translations.noParticipants || 'No participants'}</div>
        )}
      </section>
    </div>
  );

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
      return participantsPanel;
    }
    return detailsPanel;
  };

  const actionButton = (view: GroupProfileView, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => selectView(view)}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors ${
        activeView === view ? 'bg-gray-100 text-primary' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  if (!open) return null;

  const requestClose = () => onOpenChange(false);

  return (
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-white px-0 py-0 transition-opacity duration-200 ease-out sm:bg-black/40 sm:px-6 sm:py-6 ${
        isClosing ? 'opacity-95 sm:opacity-0' : 'opacity-100'
      }`}
      onMouseDown={requestClose}
    >
      <div
        className={`relative h-full w-full max-w-full overflow-hidden bg-white shadow-2xl transition-all duration-200 ease-out sm:h-[min(780px,calc(100vh-3rem))] sm:w-[420px] sm:rounded-lg ${
          isClosing
            ? 'translate-x-full opacity-95 sm:translate-x-0 sm:translate-y-3 sm:scale-95 sm:opacity-0'
            : 'translate-x-0 opacity-100 sm:translate-y-0 sm:scale-100'
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-full min-h-0 w-full flex-col bg-white text-gray-950">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <h2 className="text-base font-semibold">{translations.groupProfile || 'Group profile'}</h2>
            </div>
            <button
              onClick={requestClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
            <div className="flex h-full min-h-0 flex-col">
              <div className="px-5 pb-3 pt-5 text-center md:pt-4">
                <button
                  type="button"
                  onClick={() => setIsAvatarViewerOpen(true)}
                  className="mx-auto block rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="View group picture"
                >
                  <img
                    src={currentGroupAvatar}
                    alt={currentGroupName}
                    className="h-24 w-24 rounded-full border border-gray-200 object-cover shadow-sm transition-opacity hover:opacity-90 md:h-20 md:w-20"
                  />
                </button>
                <h3 className="mt-3 break-words text-xl font-semibold leading-tight text-gray-950">{currentGroupName}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {participants.length} {translations.participants || 'participants'}
                </p>
              </div>

              <div
                className="grid gap-2 border-y border-gray-200 px-4 py-3"
                style={{ gridTemplateColumns: `repeat(${actionColumns}, minmax(0, 1fr))` }}
              >
                {actionButton('details', <Users className="h-5 w-5" />, translations.info || 'Info')}
                {actionButton('participants', <UserPlus className="h-5 w-5" />, translations.participants || 'Participants')}
                {actionButton('search', <Search className="h-5 w-5" />, translations.search || 'Search')}
                {canShowPhotosAction && actionButton('photos', <ImageIcon className="h-5 w-5" />, translations.photos || 'Photos')}
                {canShowAudiosAction && actionButton('audios', <Music className="h-5 w-5" />, translations.audios || 'Audios')}
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
                {panelTransition ? (
                  <>
                    <div
                      key={`from-${panelTransition.key}-${panelTransition.from}`}
                      aria-hidden
                      inert
                      className={`absolute inset-0 overflow-y-auto bg-white ${
                        panelTransition.direction === 'forward'
                          ? 'profile-panel-slide-out-left'
                          : 'profile-panel-slide-out-right'
                      }`}
                    >
                      {renderPanelContent(panelTransition.from, { autoFocusSearch: false })}
                    </div>
                    <div
                      key={`to-${panelTransition.key}-${panelTransition.to}`}
                      className={`absolute inset-0 overflow-y-auto bg-white ${
                        panelTransition.direction === 'forward'
                          ? 'profile-panel-slide-in-right'
                          : 'profile-panel-slide-in-left'
                      }`}
                    >
                      {renderPanelContent(panelTransition.to, { autoFocusSearch: false })}
                    </div>
                  </>
                ) : (
                  <div key={`active-${activeView}`} className="absolute inset-0 overflow-y-auto bg-white">
                    {renderPanelContent(activeView, { autoFocusSearch: activeView === 'search' })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {groupConfirm && (
          <ConfirmModal
            title={groupConfirm.title}
            message={groupConfirm.message}
            consequences={groupConfirm.consequences}
            onConfirm={groupConfirm.onConfirm}
            onCancel={onCloseGroupConfirm}
            confirmText={groupConfirm.confirmText}
            isError={!!groupConfirm.isError}
            isDestructive={!!groupConfirm.isDestructive}
            contained
          />
        )}
        {isAvatarViewerOpen && (
          <GroupAvatarViewer
            avatarUrl={currentGroupAvatar}
            groupName={currentGroupName}
            onClose={() => setIsAvatarViewerOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default GroupProfileDialog;
