import React from 'react';
import { Camera, Crown, LogOut, Shield, Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { useLanguage } from '@/shared/contexts/LanguageContext';

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
}

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  onAddParticipant: () => void;
  onRemoveParticipant: (username: string) => void;
  onRoleChange: (username: string, role: GroupRole) => void;
  onTransferOwner: (username: string) => void;
  onDeleteGroup: () => void;
  onLeaveGroup: () => void;
  onOpenUserProfile: (username: string) => void;
}

const roleLabel = (role: GroupRole, translations: any) => {
  if (role === 'owner') return translations.owner || 'Owner';
  if (role === 'admin') return translations.admin || 'Admin';
  if (role === 'moderator') return translations.moderator || 'Moderator';
  return translations.member || 'Member';
};

const GroupSettingsDialog: React.FC<GroupSettingsDialogProps> = ({
  open,
  onOpenChange,
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
  onDeleteGroup,
  onLeaveGroup,
  onOpenUserProfile,
}) => {
  const { translations } = useLanguage();
  const permissions = groupDetails?.permissions;
  const canEdit = !!permissions?.can_edit_group;
  const canManage = !!permissions?.can_manage_participants;
  const canAssignRoles = !!permissions?.can_assign_roles;
  const canTransferOwnership = !!permissions?.can_transfer_ownership;
  const canDeleteGroup = !!permissions?.can_delete_group;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[82vh] max-h-[640px] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{translations.groupSettings || 'Group settings'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="info" className="flex min-h-0 flex-1 flex-col px-6 pb-6">
          <TabsList className="mt-4 grid w-full grid-cols-3">
            <TabsTrigger value="info">{translations.group || 'Group'}</TabsTrigger>
            <TabsTrigger value="participants">{translations.participants || 'Participants'}</TabsTrigger>
            <TabsTrigger value="moderation">{translations.moderation || 'Moderation'}</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="min-h-0 flex-1 overflow-y-auto pt-4 data-[state=inactive]:hidden">
            <div className="flex items-center gap-4">
              <img src={currentGroupAvatar} alt={currentGroupName} className="h-20 w-20 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-semibold">{currentGroupName}</div>
                <div className="text-sm text-muted-foreground">
                  {groupDetails?.participants.length || 0} {translations.participants || 'participants'}
                </div>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => groupAvatarInputRef.current?.click()}
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Camera className="h-4 w-4" />
                      {translations.changeAvatar || 'Change avatar'}
                    </button>
                    <input ref={groupAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
                  </>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={groupForm.name}
                onChange={(event) => setGroupForm((form) => ({ ...form, name: event.target.value }))}
                disabled={!canEdit}
                placeholder={translations.groupName || 'Group name'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
              />
              <textarea
                value={groupForm.description}
                onChange={(event) => setGroupForm((form) => ({ ...form, description: event.target.value }))}
                disabled={!canEdit}
                placeholder={translations.groupDescription || 'Group description'}
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={onSaveGroup}
                  disabled={isSavingGroup || !groupForm.name.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {translations.save || 'Save'}
                </button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="participants" className="min-h-0 flex-1 overflow-y-auto pt-4 data-[state=inactive]:hidden">
            {canManage && (
              <div className="mb-4 flex gap-2">
                <input
                  value={participantInput}
                  onChange={(event) => setParticipantInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && onAddParticipant()}
                  placeholder={translations.enterUsername || 'Enter username'}
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={onAddParticipant}
                  disabled={!participantInput.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {translations.addParticipant || 'Add'}
                </button>
              </div>
            )}

            <div className="rounded-md border border-border">
              {groupDetails?.participants.map((participant) => {
                const isOwner = participant.role === 'owner';
                const isCurrentUser = participant.username === currentUsername;
                return (
                  <div key={participant.id} className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0">
                    <button type="button" onClick={() => onOpenUserProfile(participant.username)} className="shrink-0 rounded-full">
                      <img src={getAvatarSrc(participant.avatar_url)} alt={participant.username} className="h-10 w-10 rounded-full object-cover" />
                    </button>
                    <button type="button" onClick={() => onOpenUserProfile(participant.username)} className="min-w-0 flex-1 text-left">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">{participant.display_name || participant.username}</span>
                        {isCurrentUser && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium leading-none text-primary">
                            {translations.me || 'Me'}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">@{participant.username}</div>
                    </button>
                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                          <Crown className="h-3 w-3" />
                          {roleLabel('owner', translations)}
                        </span>
                      ) : canAssignRoles ? (
                        <select
                          value={participant.role}
                          onChange={(event) => onRoleChange(participant.username, event.target.value as GroupRole)}
                          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                        >
                          <option value="member">{roleLabel('member', translations)}</option>
                          <option value="moderator">{roleLabel('moderator', translations)}</option>
                          <option value="admin">{roleLabel('admin', translations)}</option>
                        </select>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {roleLabel(participant.role, translations)}
                        </span>
                      )}
                      {canTransferOwnership && !isOwner && (
                        <button
                          type="button"
                          onClick={() => onTransferOwner(participant.username)}
                          className="rounded-md p-2 text-amber-700 hover:bg-amber-100"
                          title={translations.transferOwnership || 'Transfer ownership'}
                        >
                          <Crown className="h-4 w-4" />
                        </button>
                      )}
                      {canManage && !isOwner && !isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => onRemoveParticipant(participant.username)}
                          className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                          title={translations.removeParticipant || 'Remove participant'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="moderation" className="min-h-0 flex-1 overflow-y-auto pt-4 data-[state=inactive]:hidden">
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 text-muted-foreground" />
                {translations.yourRole || 'Your role'}
              </div>
              <div className="mt-2 text-lg font-semibold">
                {roleLabel(groupDetails?.current_user_role || 'member', translations)}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {permissions?.can_delete_any_message
                  ? translations.canModerateMessages || 'You can moderate messages in this group.'
                  : translations.memberPermissions || 'You can write messages in this group.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onLeaveGroup}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-destructive px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              {translations.leaveGroup || 'Leave group'}
            </button>

            {canDeleteGroup && (
              <button
                type="button"
                onClick={onDeleteGroup}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4" />
                {translations.deleteGroup || 'Delete group'}
              </button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default GroupSettingsDialog;
