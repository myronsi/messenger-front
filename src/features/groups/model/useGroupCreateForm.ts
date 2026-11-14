import { useEffect, useMemo, useRef, useState } from 'react';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';
import { useSearchUsersQuery } from '@/entities/user';
import type { User } from '@/entities/user';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useLanguage } from '@/shared/contexts/LanguageContext';

export interface GroupCreatePayload {
  groupName: string;
  description: string;
  participants: string[];
  avatarFile: File | null;
  setRejectedParticipants: (rejected: Record<string, string>) => void;
}

interface UseGroupCreateFormOptions {
  currentUsername: string;
  onCreate: (payload: GroupCreatePayload) => Promise<void> | void;
}

export const getAvatarSrc = (avatarUrl?: string | null, fallback = DEFAULT_AVATAR) => resolveMediaUrl(avatarUrl, fallback);

export const useGroupCreateForm = ({ currentUsername, onCreate }: UseGroupCreateFormOptions) => {
  const { translations } = useLanguage();
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const { data: searchData, isFetching: isSearching } = useSearchUsersQuery(debouncedSearch, {
    skip: debouncedSearch.length < 2,
  });
  const { data: dmChatsData } = useGetOneOnOneChatsQuery(currentUsername, {
    skip: !currentUsername,
  });

  const selectedUsernames = useMemo(
    () => new Set(selectedUsers.map((user) => user.username.toLowerCase())),
    [selectedUsers],
  );
  const recentContacts = useMemo(() => {
    const seen = new Set<string>();
    const query = searchTerm.trim().toLowerCase().replace(/^@/, '');
    return (dmChatsData?.chats || [])
      .filter((chat) => !chat.interlocutor_deleted && !!chat.interlocutor_name)
      .map((chat) => ({
        id: `-${chat.id}`,
        username: chat.interlocutor_name,
        display_name: chat.interlocutor_display_name || chat.interlocutor_name,
        avatar_url: chat.avatar_url,
      } as User))
      .filter((user) => {
        const usernameKey = user.username.toLowerCase();
        if (usernameKey === currentUsername.toLowerCase() || seen.has(usernameKey)) return false;
        seen.add(usernameKey);
        return !query || usernameKey.includes(query) || (user.display_name || '').toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [currentUsername, dmChatsData?.chats, searchTerm]);

  const searchResults = useMemo(() => {
    if (debouncedSearch.length < 2) return [];
    const recent = new Set(recentContacts.map((user) => user.username.toLowerCase()));
    return (searchData?.users || []).filter((user) => {
      const usernameKey = user.username.toLowerCase();
      return usernameKey !== currentUsername.toLowerCase() && !recent.has(usernameKey);
    });
  }, [currentUsername, debouncedSearch, recentContacts, searchData?.users]);

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

  const toggleUser = (user: User) => {
    if (selectedUsernames.has(user.username.toLowerCase())) {
      const selected = selectedUsers.find((item) => item.username.toLowerCase() === user.username.toLowerCase());
      if (selected) handleRemoveUser(selected.username);
      return;
    }
    handleSelectUser(user);
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
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message
          : translations.groupCreationFailed || 'Group creation failed';
      setCreateError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    avatarFile, avatarInputRef, avatarPreview, createError, debouncedSearch, description,
    groupName, handleAvatarChange, handleCreate, handleRemoveAvatar, handleRemoveUser,
    handleSelectUser, isCreating, isSearching, recentContacts, rejectedParticipants, searchResults,
    searchTerm, selectedUsers, selectedUsernames, setDescription, setGroupName,
    setRejectedParticipants, setSearchTerm, toggleUser, translations,
  };
};
