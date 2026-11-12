import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React, { useEffect, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useGetGroupMembersQuery } from '@/entities/chat';
import { ChevronDown, Crown, MoreVertical, Search, Trash2, UserPlus } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupTranslations } from './groupChatTypes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import type { GroupProfileDialogProps, GroupParticipant, GroupPendingInvite, GroupRole } from './GroupProfileTypes';
import { roleLabel, roleTone } from './groupProfileHelpers';

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
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  const matches = useGetGroupMembersQuery(debounced ? { chatId: model.chatId, q: debounced } : skipToken).data;
  const matchIds = debounced && matches ? new Set(matches.members.map((member) => String(member.id))) : null;
  const shownParticipants = matchIds ? sortedParticipants.filter((participant) => matchIds.has(String(participant.id))) : sortedParticipants;
  const renderParticipant = (participant: GroupParticipant) => {
    const isOwner = participant.role === 'owner';
    const isCurrentUser = participant.username === currentUsername;
    return (
      <div key={participant.id} className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0">
        <button type="button" onClick={() => onOpenUserProfile(participant.username)} className="shrink-0 rounded-full">
          <AuthenticatedImage src={getAvatarSrc(participant.avatar_url)} alt={participant.username} className="h-10 w-10 rounded-full object-cover" />
        </button>
        <button type="button" onClick={() => onOpenUserProfile(participant.username)} className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{participant.display_name || participant.username}</span>
            {isCurrentUser && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium leading-none text-primary">
                {translations.me || 'Me'}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">@{participant.username}</div>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {isOwner ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
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
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={translations.actions || 'Actions'}
                  title={translations.actions || 'Actions'}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[1300] w-48">
                {canTransferOwnership && !isOwner && (
                  <DropdownMenuItem onClick={() => onTransferOwner(participant.username)} className="gap-2">
                    <Crown className="h-4 w-4 text-warning" />
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
    <div key={`pending-${invite.request_id}`} className="flex items-center gap-3 border-b border-border bg-warning-soft/50 px-3 py-3 last:border-b-0">
      <button type="button" onClick={() => onOpenUserProfile(invite.username)} className="shrink-0 rounded-full">
        <AuthenticatedImage src={getAvatarSrc(invite.avatar_url)} alt={invite.username} className="h-10 w-10 rounded-full object-cover opacity-80" />
      </button>
      <button type="button" onClick={() => onOpenUserProfile(invite.username)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-medium text-foreground">{invite.display_name || invite.username}</div>
        <div className="truncate text-xs text-muted-foreground">@{invite.username}</div>
      </button>
      <span className="shrink-0 rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
        {translations.pending || 'Pending'}
      </span>
    </div>
  );

  return (
    <div className="min-h-full space-y-3 px-5 py-4 md:py-3">
      {canManage && (
        <section className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {translations.addParticipant || 'Add participant'}
          </div>
          <div className="flex gap-2">
            <input
              value={participantInput}
              onChange={(event) => setParticipantInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onAddParticipant()}
              placeholder={translations.enterUsername || 'Enter username'}
              className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
            <div className="mt-3 overflow-hidden rounded-md border border-dashed border-border bg-muted/50">
              <button
                type="button"
                onClick={() => setIsDmContactsCollapsed((collapsed) => !collapsed)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
                aria-expanded={!isDmContactsCollapsed}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {translations.directMessages || 'Direct messages'}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {dmContactSuggestions.length} {translations.available || 'available'}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isDmContactsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
              </button>
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isDmContactsCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                <div className="min-h-0 overflow-hidden">
                  <div className="max-h-44 overflow-y-auto border-t border-border p-1">
                    {dmContactSuggestions.map((contact) => (
                      <button
                        key={contact.username}
                        type="button"
                        onClick={() => onAddParticipant(contact.username)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-background"
                      >
                        <AuthenticatedImage src={getAvatarSrc(contact.avatar_url)} alt={contact.username} className="h-8 w-8 rounded-full object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{contact.display_name}</span>
                          <span className="block truncate text-xs text-muted-foreground">@{contact.username}</span>
                        </span>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
      <label className="flex items-center gap-2 rounded-full bg-muted px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={rawTranslations.profileRework.searchMembers}
          aria-label={rawTranslations.profileRework.searchMembers} className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none" />
      </label>
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {shownParticipants.length + (matchIds ? 0 : pendingInvites.length) > 0 ? (
          <>
            {shownParticipants.map(renderParticipant)}
            {!matchIds && pendingInvites.map(renderPendingInvite)}
          </>
        ) : (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            {matchIds ? rawTranslations.profileRework.noMembers : translations.noParticipants || 'No participants'}
          </div>
        )}
      </section>
    </div>
  );


};

export default GroupParticipantsPanel;
