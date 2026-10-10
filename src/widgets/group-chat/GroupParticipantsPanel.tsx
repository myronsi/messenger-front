import React from 'react';
import { ChevronDown, Crown, MoreVertical, Trash2, UserPlus } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupTranslations } from './groupChatTypes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import type { GroupProfileDialogProps, GroupParticipant, GroupPendingInvite, GroupRole } from './GroupProfileTypes';
import { roleLabel, roleTone } from './groupProfileHelpers';
import MediaImg from '@/shared/ui/MediaImg';

interface ContactSuggestion { username: string; display_name: string; avatar_url?: string | null; }
interface Props {
  model: GroupProfileDialogProps; canManage: boolean; canAssignRoles: boolean; canTransferOwnership: boolean;
  isDmContactsCollapsed: boolean; setIsDmContactsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  dmContactSuggestions: ContactSuggestion[]; sortedParticipants: GroupParticipant[];
  pendingInvites: GroupPendingInvite[];
}

const GroupParticipantsPanel: React.FC<Props> = ({
  model, canManage, canAssignRoles, canTransferOwnership, isDmContactsCollapsed, setIsDmContactsCollapsed,
  dmContactSuggestions, sortedParticipants, pendingInvites,
}) => {
  const { translations: rawTranslations } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;
  const {
    currentUsername, getAvatarSrc, onOpenUserProfile, onRoleChange, onTransferOwner, onRemoveParticipant,
    participantInput, setParticipantInput, onAddParticipant,
  } = model;
  const renderParticipant = (participant: GroupParticipant) => {
    const isOwner = participant.role === 'owner';
    const isCurrentUser = participant.username === currentUsername;
    return (
      <div key={participant.id} className="flex items-center gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0">
        <button type="button" onClick={() => onOpenUserProfile(participant.username)} className="shrink-0 rounded-full">
          <MediaImg src={getAvatarSrc(participant.avatar_url)} alt={participant.username} className="h-10 w-10 rounded-full object-cover" />
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
        <MediaImg src={getAvatarSrc(invite.avatar_url)} alt={invite.username} className="h-10 w-10 rounded-full object-cover opacity-80" />
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

  return (
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
                        <MediaImg src={getAvatarSrc(contact.avatar_url)} alt={contact.username} className="h-8 w-8 rounded-full object-cover" />
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


};

export default GroupParticipantsPanel;
