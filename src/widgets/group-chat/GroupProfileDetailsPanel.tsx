import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import { Camera, Check, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupTranslations } from './groupChatTypes';
import type { GroupProfileDialogProps, GroupParticipant, GroupPendingInvite, GroupRole } from './GroupProfileTypes';
import { roleLabel } from './groupProfileHelpers';
import GroupRoleHistoryRow from './GroupRoleHistoryRow';

interface Props {
  model: GroupProfileDialogProps; canEdit: boolean; canDeleteGroup: boolean; hasGroupChanges: boolean;
  currentRole: GroupRole; participants: GroupParticipant[]; pendingInvites: GroupPendingInvite[];
  onOpenRoleHistory: () => void;
}

const GroupProfileDetailsPanel: React.FC<Props> = ({
  model, canEdit, canDeleteGroup, hasGroupChanges, currentRole, participants, pendingInvites, onOpenRoleHistory,
}) => {
  const { translations: rawTranslations } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;
  const {
    groupAvatarInputRef, onAvatarUpload, groupForm, setGroupForm,
    isSavingGroup, onSaveGroup, groupDetails, onLeaveGroup, onDeleteGroup, currentUsername, getAvatarSrc,
  } = model;
  const me = participants.find((participant) => participant.username.toLowerCase() === currentUsername.toLowerCase());
  const changeAvatarLabel = translations.changeAvatar || 'Change avatar';
  const descriptionLabel = translations.groupDescription || 'Description';
  return (
    <div className="min-h-full space-y-3 px-5 py-4 md:py-3">
      <section className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <AuthenticatedImage src={getAvatarSrc(me?.avatar_url)} alt="" initialsFrom={me?.display_name || me?.username || currentUsername}
            className="h-12 w-12 shrink-0 rounded-full border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.yourRole || 'Your role'}</div>
            <div className="mt-1 inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-subtle-foreground">
              {roleLabel(currentRole, translations)}
            </div>
          </div>
        </div>
      </section>

      {canEdit ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => groupAvatarInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium text-subtle-foreground transition-colors hover:bg-accent/60"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {changeAvatarLabel}
            </button>
            <input ref={groupAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.groupName || 'Group name'}</label>
            <input
              value={groupForm.name}
              onChange={(event) => setGroupForm((form) => ({ ...form, name: event.target.value }))}
              placeholder={translations.groupName || 'Group name'}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{descriptionLabel}</label>
            <textarea
              value={groupForm.description}
              onChange={(event) => setGroupForm((form) => ({ ...form, description: event.target.value }))}
              placeholder={descriptionLabel}
              rows={4}
              className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
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
            <section className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {descriptionLabel}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-5 text-foreground">{groupDetails.description}</p>
            </section>
          )}
        </>
      )}

      <section className="rounded-lg border border-border bg-muted/50 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.group || 'Group'}</div>
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{translations.participants || 'Participants'}</span>
            <span className="font-medium text-foreground">{participants.length + pendingInvites.length}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{translations.owner || 'Owner'}</span>
            <span className="min-w-0 truncate font-medium text-foreground">@{groupDetails?.owner_username || groupDetails?.admin_username || '-'}</span>
          </div>
        </div>
      </section>

      <GroupRoleHistoryRow chatId={model.chatId} onOpen={onOpenRoleHistory} />

      <button
        type="button"
        onClick={onLeaveGroup}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive-soft"
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


};

export default GroupProfileDetailsPanel;
