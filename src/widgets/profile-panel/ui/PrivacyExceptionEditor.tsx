import { mediaUrl } from '@/shared/lib/mediaUrl';
import type { Id } from '@/shared/lib/ids';
import React from 'react';
import { CheckCircle2, ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { PrivacyExceptionEffect, PrivacyExceptionKey, PrivacySettings } from '@/features/profile';
import type { User } from '@/entities/user';
import type { useLanguage } from '@/shared/contexts/LanguageContext';
import MediaImg from '@/shared/ui/MediaImg';

type PrivacyCandidate = Partial<Pick<User, 'id' | 'display_name' | 'avatar_url'>> & { username: string };
type Translations = ReturnType<typeof useLanguage>['translations'];
interface Props {
  settingKey: PrivacyExceptionKey; mode: string; currentUsername: string;
  privacySettings?: PrivacySettings; exceptionDrafts: Record<PrivacyExceptionKey, string>;
  setExceptionDrafts: React.Dispatch<React.SetStateAction<Record<PrivacyExceptionKey, string>>>;
  dmCandidates: PrivacyCandidate[]; searchData?: { users: PrivacyCandidate[] }; debouncedSearch: string;
  isSearchingUsers: boolean; activeExceptionKey: PrivacyExceptionKey | null;
  setActiveExceptionKey: React.Dispatch<React.SetStateAction<PrivacyExceptionKey | null>>;
  collapsedExceptionKeys: Record<PrivacyExceptionKey, boolean>;
  setCollapsedExceptionKeys: React.Dispatch<React.SetStateAction<Record<PrivacyExceptionKey, boolean>>>;
  handleExceptionListChange: (key: PrivacyExceptionKey, effect: PrivacyExceptionEffect, userIds: Id[]) => void;
  handleAddException: (key: PrivacyExceptionKey, effect: PrivacyExceptionEffect, username: string) => void;
  isUpdatingExceptions: boolean; isLookingUpUser: boolean; translations: Translations;
}
const exceptionEffectForMode = (mode?: string): PrivacyExceptionEffect | null => {
  if (mode === 'everyone_except') return 'deny';
  if (mode === 'nobody_except') return 'allow';
  return null;
};
const PrivacyExceptionEditor: React.FC<Props> = (props) => {
  const {
    settingKey: key, mode, currentUsername, privacySettings, exceptionDrafts, setExceptionDrafts,
    dmCandidates, searchData, debouncedSearch, isSearchingUsers, activeExceptionKey, setActiveExceptionKey,
    collapsedExceptionKeys, setCollapsedExceptionKeys, handleExceptionListChange, handleAddException,
    isUpdatingExceptions, isLookingUpUser, translations,
  } = props;
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
        <MediaImg src={mediaUrl(candidate.avatar_url)} alt={candidate.username} className="h-8 w-8 rounded-full object-cover" />
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
    const selectedUsernames = new Set<string>(selectedUsers.map((user) => user.username.toLowerCase()));
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
                      <MediaImg src={mediaUrl(user.avatar_url)} alt={user.username} className="h-6 w-6 rounded-full object-cover" />
                      <span className="max-w-36 truncate">@{user.username}</span>
                      <button
                        type="button"
                        disabled={isUpdatingExceptions}
                        onClick={() => handleExceptionListChange(
                          key,
                          effect,
                          selectedUsers.filter((selectedUser) => selectedUser.id !== user.id).map((selectedUser) => selectedUser.id),
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


  return renderExceptionEditor(key, mode);
};
export default PrivacyExceptionEditor;
