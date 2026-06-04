import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ChevronLeft, Loader2, Search, UserPlus, X } from 'lucide-react';
import { useSearchUsersQuery } from '@/app/api/messengerApi';
import { User } from '@/entities/user';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { useLanguage } from '@/shared/contexts/LanguageContext';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface GroupCreatePayload {
  groupName: string;
  description: string;
  participants: string[];
  avatarFile: File | null;
  setRejectedParticipants: (rejected: Record<string, string>) => void;
}

interface GroupCreateModalProps {
  currentUsername: string;
  onClose: () => void;
  onCreate: (payload: GroupCreatePayload) => Promise<void> | void;
}

const getAvatarSrc = (avatarUrl?: string | null) => {
  if (!avatarUrl) return DEFAULT_AVATAR;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  return `${BASE_URL}${avatarUrl}`;
};

const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ currentUsername, onClose, onCreate }) => {
  const { translations } = useLanguage();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [rejectedParticipants, setRejectedParticipants] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const { data: searchData, isFetching: isSearching } = useSearchUsersQuery(debouncedSearch, {
    skip: debouncedSearch.length < 2,
  });

  const selectedUsernames = useMemo(
    () => new Set(selectedUsers.map((user) => user.username.toLowerCase())),
    [selectedUsers],
  );

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    event.target.value = '';
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSelectUser = (user: User) => {
    const usernameKey = user.username.toLowerCase();
    if (usernameKey === currentUsername.toLowerCase() || selectedUsernames.has(usernameKey)) return;
    setSelectedUsers((users) => [...users, user]);
    setRejectedParticipants((rejected) => {
      const next = { ...rejected };
      delete next[user.username];
      return next;
    });
  };

  const handleRemoveUser = (username: string) => {
    setSelectedUsers((users) => users.filter((user) => user.username !== username));
    setRejectedParticipants((rejected) => {
      const next = { ...rejected };
      delete next[username];
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || isCreating) return;
    setCreateError(null);
    setRejectedParticipants({});
    setIsCreating(true);
    try {
      await onCreate({
        groupName: groupName.trim(),
        description: description.trim(),
        participants: selectedUsers.map((user) => user.username),
        avatarFile,
        setRejectedParticipants,
      });
    } catch (error: any) {
      setCreateError(error?.message || translations.groupCreationFailed || 'Group creation failed');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="motion-panel-in relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{translations.createGroup || 'Create group'}</h2>
            <p className="text-xs text-muted-foreground">
              {step === 1
                ? translations.groupInfo || 'Group info'
                : translations.addParticipants || 'Add participants'}
            </p>
          </div>
          <button onClick={onClose} className="motion-press rounded-full p-2 hover:bg-accent" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-5 py-3 text-xs font-medium">
          <div className={`transition-all duration-200 rounded-full px-3 py-1.5 text-center ${step === 1 ? 'scale-[1.02] bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>
            1. {translations.group || 'Group'}
          </div>
          <div className={`transition-all duration-200 rounded-full px-3 py-1.5 text-center ${step === 2 ? 'scale-[1.02] bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>
            2. {translations.participants || 'Participants'}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === 1 ? (
            <div className="motion-panel-in space-y-5">
              <div className="flex items-center gap-4">
                <img
                  src={avatarPreview || `${BASE_URL}${DEFAULT_GROUP_AVATAR}`}
                  alt={groupName || translations.createGroup || 'Create group'}
                  className="h-20 w-20 rounded-full border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="motion-press inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Camera className="h-4 w-4" />
                    {avatarFile ? translations.changeAvatar || 'Change avatar' : translations.chooseAvatar || 'Choose avatar'}
                  </button>
                  {avatarFile && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="motion-press ml-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {translations.remove || 'Remove'}
                    </button>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </div>

              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder={translations.groupName || 'Group name'}
                maxLength={80}
                className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={translations.groupDescription || 'Group description'}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ) : (
            <div className="motion-panel-in space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={translations.searchUsers || 'Search users'}
                  className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="rounded-md border border-border">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {translations.loading || 'Loading...'}
                  </div>
                ) : debouncedSearch.length >= 2 && (searchData?.users || []).length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {translations.noUsersFound || 'No users found'}
                  </div>
                ) : debouncedSearch.length < 2 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {translations.searchUsers || 'Search users'}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {(searchData?.users || []).map((user) => {
                      const usernameKey = user.username.toLowerCase();
                      const isSelf = usernameKey === currentUsername.toLowerCase();
                      const isSelected = selectedUsernames.has(usernameKey);
                      const isDisabled = isSelf || isSelected;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          disabled={isDisabled}
                          className="motion-list-item motion-press flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left last:border-b-0 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <img src={getAvatarSrc(user.avatar_url)} alt={user.username} className="motion-avatar h-10 w-10 rounded-full object-cover" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{user.display_name || user.username}</span>
                            <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
                          </span>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">
                  {translations.selectedParticipants || 'Selected participants'} ({selectedUsers.length})
                </div>
                {selectedUsers.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                    {translations.noParticipantsSelected || 'No participants selected'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedUsers.map((user) => (
                      <div key={user.id} className="motion-list-item flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <img src={getAvatarSrc(user.avatar_url)} alt={user.username} className="motion-avatar h-9 w-9 rounded-full object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{user.display_name || user.username}</div>
                          <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
                          {rejectedParticipants[user.username] && (
                            <div className="motion-error-in mt-1 text-xs text-destructive">{rejectedParticipants[user.username]}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.username)}
                          className="motion-press rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label={translations.delete || 'Delete'}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {createError && (
                <div className="motion-error-in rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-4">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="motion-press inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              {translations.back || 'Back'}
            </button>
          ) : (
            <span />
          )}
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!groupName.trim()}
              className="motion-press rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {translations.next || 'Next'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={!groupName.trim() || selectedUsers.length === 0 || isCreating}
              className="motion-press inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              {translations.create || 'Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCreateModal;
