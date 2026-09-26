import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Plus, Shield, X } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import {
  PrivacyExceptionEffect,
  PrivacyExceptionKey,
  PrivacySettings,
  useGetCurrentUserQuery,
  useGetOneOnOneChatsQuery,
  useGetPrivacySettingsQuery,
  useLazyGetUserByUsernameQuery,
  useSearchUsersQuery,
  useUpdatePrivacyExceptionsMutation,
  useUpdatePrivacySettingsMutation,
} from '@/app/api/messengerApi';
import type { User } from '@/entities/user';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';

const BASE_URL = import.meta.env.VITE_BASE_URL;

type PrivacySettingKey = Exclude<keyof PrivacySettings, 'privacy_exceptions'>;
type PrivacyCandidate = Partial<Pick<User, 'id' | 'display_name' | 'avatar_url'>> & { username: string };

const exceptionKeys = ['avatar_visibility', 'profile_visibility', 'presence_visibility', 'group_invites'] as const;
const exceptionKeySet = new Set<PrivacyExceptionKey>(exceptionKeys);
const avatarProfileVisibilityOptions = ['everyone', 'shared_chats', 'everyone_except', 'nobody_except'] as const;
const presenceVisibilityOptions = ['everyone', 'shared_chats', 'nobody', 'everyone_except', 'nobody_except'] as const;
const directMessageVisibilityOptions = ['everyone', 'shared_chats', 'wait_approval'] as const;
const groupInviteVisibilityOptions = ['everyone', 'shared_chats', 'nobody', 'everyone_except', 'nobody_except', 'wait_approval'] as const;
const searchOptions = ['everyone', 'nobody'] as const;
type StatusMessage = { type: 'success' | 'error'; text: string };

interface PrivacySettingsPanelProps {
  isActive: boolean;
  onBack: () => void;
}

const getAvatarSrc = (avatarUrl?: string | null) => {
  if (!avatarUrl) return DEFAULT_AVATAR;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  return `${BASE_URL}${avatarUrl}`;
};

const exceptionEffectForMode = (mode?: string): PrivacyExceptionEffect | null => {
  if (mode === 'everyone_except') return 'deny';
  if (mode === 'nobody_except') return 'allow';
  return null;
};

const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({ isActive, onBack }) => {
  const { translations } = useLanguage();
  const { data: currentUser } = useGetCurrentUserQuery(undefined, { skip: !isActive });
  const currentUsername = currentUser?.username || '';
  const { data: privacySettings, isLoading: isLoadingPrivacy } = useGetPrivacySettingsQuery(undefined, { skip: !isActive });
  const { data: dmChatsData } = useGetOneOnOneChatsQuery(currentUsername, { skip: !isActive || !currentUsername });
  const [updatePrivacySettings, { isLoading: isUpdatingPrivacy }] = useUpdatePrivacySettingsMutation();
  const [updatePrivacyExceptions, { isLoading: isUpdatingExceptions }] = useUpdatePrivacyExceptionsMutation();
  const [lookupUser, { isFetching: isLookingUpUser }] = useLazyGetUserByUsernameQuery();
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [openSelect, setOpenSelect] = useState<PrivacySettingKey | null>(null);
  const [activeExceptionKey, setActiveExceptionKey] = useState<PrivacyExceptionKey | null>(null);
  const [collapsedExceptionKeys, setCollapsedExceptionKeys] = useState<Record<PrivacyExceptionKey, boolean>>({
    avatar_visibility: true,
    profile_visibility: true,
    presence_visibility: true,
    group_invites: true,
  });
  const [exceptionDrafts, setExceptionDrafts] = useState<Record<PrivacyExceptionKey, string>>({
    avatar_visibility: '',
    profile_visibility: '',
    presence_visibility: '',
    group_invites: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(null), status.type === 'success' ? 2200 : 4000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (!isActive) return;
    setActiveExceptionKey(null);
    setCollapsedExceptionKeys({
      avatar_visibility: true,
      profile_visibility: true,
      presence_visibility: true,
      group_invites: true,
    });
  }, [isActive]);

  useEffect(() => {
    const activeValue = activeExceptionKey ? exceptionDrafts[activeExceptionKey].trim() : '';
    const timeout = window.setTimeout(() => setDebouncedSearch(activeValue), 250);
    return () => window.clearTimeout(timeout);
  }, [activeExceptionKey, exceptionDrafts]);

  const { data: searchData, isFetching: isSearchingUsers } = useSearchUsersQuery(debouncedSearch, {
    skip: !isActive || debouncedSearch.length < 2,
  });

  const dmCandidates = useMemo<PrivacyCandidate[]>(() => {
    const seen = new Set<string>();
    return (dmChatsData?.chats || []).reduce<PrivacyCandidate[]>((users, chat) => {
      if (chat.interlocutor_deleted || !chat.interlocutor_name) return users;
      const usernameKey = chat.interlocutor_name.toLowerCase();
      if (usernameKey === currentUsername.toLowerCase() || seen.has(usernameKey)) return users;
      seen.add(usernameKey);
      users.push({
        username: chat.interlocutor_name,
        display_name: chat.interlocutor_display_name,
        avatar_url: chat.avatar_url,
      });
      return users;
    }, []);
  }, [currentUsername, dmChatsData?.chats]);

  const visibilityLabel = (value: string) => {
    if (value === 'shared_chats') return translations.sharedChats || 'Shared chats';
    if (value === 'nobody') return translations.nobody || 'Nobody';
    if (value === 'everyone_except') return translations.everyoneExceptSelected || 'Everyone except selected';
    if (value === 'nobody_except') return translations.nobodyExceptSelected || 'Nobody except selected';
    if (value === 'wait_approval') return translations.waitApproval || 'Wait for my approval';
    return translations.everyone || 'Everyone';
  };

  const handlePrivacyChange = async (key: PrivacySettingKey, value: string | boolean) => {
    setStatus(null);
    try {
      await updatePrivacySettings({ [key]: value }).unwrap();
      setStatus({ type: 'success', text: translations.saved || 'Saved' });
    } catch (error: any) {
      setStatus({ type: 'error', text: error?.data?.detail || 'Failed to update privacy settings' });
    }
  };

  const handleExceptionListChange = async (key: PrivacyExceptionKey, effect: PrivacyExceptionEffect, usernames: string[]) => {
    setStatus(null);
    try {
      await updatePrivacyExceptions({ settingKey: key, effect, usernames }).unwrap();
      setStatus({ type: 'success', text: translations.saved || 'Saved' });
    } catch (error: any) {
      setStatus({ type: 'error', text: error?.data?.detail || 'Failed to update privacy exceptions' });
    }
  };

  const handleAddException = async (key: PrivacyExceptionKey, effect: PrivacyExceptionEffect, username: string) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || trimmedUsername.toLowerCase() === currentUsername.toLowerCase()) return;
    const currentUsers = privacySettings?.privacy_exceptions?.[key]?.[effect] || [];
    if (currentUsers.some((user) => user.username.toLowerCase() === trimmedUsername.toLowerCase())) return;

    try {
      const resolvedUser = await lookupUser(trimmedUsername).unwrap();
      const nextUsernames = [...currentUsers.map((user) => user.username), resolvedUser.username];
      await handleExceptionListChange(key, effect, nextUsernames);
      setExceptionDrafts((drafts) => ({ ...drafts, [key]: '' }));
      setDebouncedSearch('');
    } catch (error: any) {
      setStatus({ type: 'error', text: error?.data?.detail || translations.userNotFound || 'User not found' });
    }
  };

  const renderCandidateButton = (
    key: PrivacyExceptionKey,
    effect: PrivacyExceptionEffect,
    candidate: PrivacyCandidate,
    selectedUsernames: Set<string>,
  ) => {
    const isSelected = selectedUsernames.has(candidate.username.toLowerCase());
    const isSelf = candidate.username.toLowerCase() === currentUsername.toLowerCase();
    return (
      <button
        key={candidate.username}
        type="button"
        disabled={isSelected || isSelf || isUpdatingExceptions || isLookingUpUser}
        onClick={() => handleAddException(key, effect, candidate.username)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <img src={getAvatarSrc(candidate.avatar_url)} alt={candidate.username} className="h-8 w-8 rounded-full object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{candidate.display_name || candidate.username}</span>
          <span className="block truncate text-xs text-muted-foreground">@{candidate.username}</span>
        </span>
        {isSelected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
      </button>
    );
  };

  const renderExceptionEditor = (key: PrivacyExceptionKey, mode?: string) => {
    const effect = exceptionEffectForMode(mode);
    if (!effect) return null;

    const selectedUsers = privacySettings?.privacy_exceptions?.[key]?.[effect] || [];
    const selectedUsernames = new Set(selectedUsers.map((user) => user.username.toLowerCase()));
    const draft = exceptionDrafts[key];
    const normalizedDraft = draft.trim().toLowerCase();
    const contactSuggestions = dmCandidates
      .filter((user) => !normalizedDraft || user.username.toLowerCase().includes(normalizedDraft) || (user.display_name || '').toLowerCase().includes(normalizedDraft))
      .slice(0, 5);
    const searchSuggestions = (searchData?.users || [])
      .filter((user) => user.username.toLowerCase() !== currentUsername.toLowerCase())
      .filter((user) => !contactSuggestions.some((contact) => contact.username.toLowerCase() === user.username.toLowerCase()))
      .slice(0, 5);
    const helperText = effect === 'deny'
      ? translations.deniedUsersDescription || 'Selected users will not be allowed for this setting.'
      : translations.allowedUsersDescription || 'Only selected users will be allowed for this setting.';
    const isCollapsed = collapsedExceptionKeys[key];
    const listLabel = effect === 'deny'
      ? translations.deniedUsers || 'Denied users'
      : translations.allowedUsers || 'Allowed users';

    return (
      <div className="mt-3 overflow-hidden rounded-md border border-dashed border-border bg-muted/25">
        <button
          type="button"
          onClick={() => {
            setCollapsedExceptionKeys((collapsedKeys) => ({ ...collapsedKeys, [key]: !collapsedKeys[key] }));
            if (!isCollapsed) setActiveExceptionKey(null);
          }}
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/50"
          aria-expanded={!isCollapsed}
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{listLabel}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {selectedUsers.length} {translations.selected || 'selected'}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
        </button>

        <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-3 border-t border-border/70 p-3">
              <div className="text-xs text-muted-foreground">{helperText}</div>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onFocus={() => setActiveExceptionKey(key)}
                  onChange={(event) => {
                    setActiveExceptionKey(key);
                    setExceptionDrafts((drafts) => ({ ...drafts, [key]: event.target.value }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleAddException(key, effect, draft);
                    }
                  }}
                  placeholder={translations.addUsername || 'Add username'}
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  disabled={!draft.trim() || isUpdatingExceptions || isLookingUpUser}
                  onClick={() => handleAddException(key, effect, draft)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={translations.add || 'Add'}
                  title={translations.add || 'Add'}
                >
                  {isLookingUpUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <span key={user.username} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2 text-xs">
                      <img src={getAvatarSrc(user.avatar_url)} alt={user.username} className="h-6 w-6 rounded-full object-cover" />
                      <span className="max-w-36 truncate">@{user.username}</span>
                      <button
                        type="button"
                        disabled={isUpdatingExceptions}
                        onClick={() => handleExceptionListChange(
                          key,
                          effect,
                          selectedUsers.filter((selectedUser) => selectedUser.username !== user.username).map((selectedUser) => selectedUser.username),
                        )}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={translations.remove || 'Remove'}
                        title={translations.remove || 'Remove'}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {activeExceptionKey === key && (
                <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-background p-1">
                  {isSearchingUsers && debouncedSearch.length >= 2 ? (
                    <div className="flex items-center justify-center gap-2 px-2 py-4 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {translations.loading || 'Loading...'}
                    </div>
                  ) : contactSuggestions.length === 0 && searchSuggestions.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                      {draft.trim() ? translations.pressEnterToAddExactUsername || 'Press Enter to add this exact username.' : translations.noDmContacts || 'No direct-message contacts yet.'}
                    </div>
                  ) : (
                    <>
                      {contactSuggestions.map((candidate) => renderCandidateButton(key, effect, candidate, selectedUsernames))}
                      {searchSuggestions.map((candidate) => renderCandidateButton(key, effect, candidate, selectedUsernames))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPrivacySelect = (
    key: PrivacySettingKey,
    label: string,
    description: string,
    options: readonly string[],
  ) => {
    const value = String(privacySettings?.[key] ?? options[0]);
    const supportsExceptions = exceptionKeySet.has(key as PrivacyExceptionKey);
    return (
      <div className="rounded-md border border-border px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
          <Select
            open={openSelect === key}
            onOpenChange={(open) => setOpenSelect(open ? key : null)}
            value={value}
            onValueChange={(nextValue) => {
              setOpenSelect(null);
              void handlePrivacyChange(key, nextValue);
            }}
            disabled={!privacySettings || isUpdatingPrivacy}
          >
            <SelectTrigger
              className="h-9 w-full sm:w-56"
              onPointerDown={(event) => {
                if (openSelect === key) {
                  event.preventDefault();
                  setOpenSelect(null);
                }
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="z-[1300]"
              onEscapeKeyDown={() => setOpenSelect(null)}
              onFocusOutside={() => setOpenSelect(null)}
              onPointerDownOutside={() => setOpenSelect(null)}
            >
              {options.map((option) => (
                <SelectItem key={option} value={option}>{visibilityLabel(option)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {supportsExceptions && renderExceptionEditor(key as PrivacyExceptionKey, value)}
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="border-b border-border px-5 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="cursor-pointer">
                <button type="button" onClick={onBack}>
                  {translations.profile || 'Profile'}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="cursor-pointer">
                <button type="button" onClick={onBack}>
                  {translations.settings || 'Settings'}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4 text-muted-foreground" />
                {translations.privacy || 'Privacy'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {status && (
        <div
          aria-live="polite"
          className={`pointer-events-none absolute right-4 top-[58px] z-10 inline-flex max-w-[min(18rem,calc(100%-2rem))] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span className="truncate">{status.text}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div>
          <p className="text-sm text-muted-foreground">
            {translations.privacyDescription || 'Control who can see and contact you.'}
          </p>
        </div>

        {isLoadingPrivacy ? (
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {translations.loading}
          </div>
        ) : (
          <div className="space-y-3">
            {renderPrivacySelect('avatar_visibility', translations.avatarVisibility || 'Avatar visibility', translations.avatarVisibilityDescription || 'Who can see your avatar.', avatarProfileVisibilityOptions)}
            {renderPrivacySelect('profile_visibility', translations.profileVisibility || 'Profile visibility', translations.profileVisibilityDescription || 'Who can see your bio.', avatarProfileVisibilityOptions)}
            {renderPrivacySelect('presence_visibility', translations.presenceVisibility || 'Online status', translations.presenceVisibilityDescription || 'Who can see online and last seen.', presenceVisibilityOptions)}
            {renderPrivacySelect('direct_messages', translations.directMessages || 'Direct messages', translations.directMessagesDescription || 'Who can start a direct chat with you.', directMessageVisibilityOptions)}
            {renderPrivacySelect('group_invites', translations.groupInvites || 'Group invites', translations.groupInvitesDescription || 'Who can add you to groups.', groupInviteVisibilityOptions)}
            {renderPrivacySelect('search_visibility', translations.searchVisibility || 'Search visibility', translations.searchVisibilityDescription || 'Whether you appear in user search.', searchOptions)}

            <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{translations.readReceipts || 'Read receipts'}</span>
                <span className="block text-xs text-muted-foreground">{translations.readReceiptsDescription || 'Let others see when you read messages.'}</span>
              </span>
              <Checkbox
                checked={!!privacySettings?.read_receipts_enabled}
                disabled={!privacySettings || isUpdatingPrivacy}
                onCheckedChange={(checked) => handlePrivacyChange('read_receipts_enabled', checked === true)}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacySettingsPanel;
