import type * as React from 'react';

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

export type GroupProfileConfirmState = {
  title: string;
  message: string;
  consequences?: string[];
  confirmText?: string;
  isDestructive?: boolean;
  isError?: boolean;
  onConfirm: () => void;
};


export interface GroupProfileDialogProps {
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


export type GroupProfileView = 'details' | 'participants' | 'search' | 'photos' | 'audios';
export type GroupProfileTransition = { from: GroupProfileView; to: GroupProfileView; direction: 'forward' | 'back'; key: number; };
