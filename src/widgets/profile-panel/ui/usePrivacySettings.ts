import { useEffect, useMemo, useState } from 'react';
import { PrivacyExceptionEffect, PrivacyExceptionKey, PrivacySettings, useGetCurrentUserQuery, useGetPrivacySettingsQuery, useUpdatePrivacyExceptionsMutation, useUpdatePrivacySettingsMutation } from '@/features/profile';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';
import { useLazyGetUserByUsernameQuery, useSearchUsersQuery } from '@/entities/user';
import type { User } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';

type PrivacySettingKey = Exclude<keyof PrivacySettings, 'privacy_exceptions'>;
type PrivacyCandidate = Partial<Pick<User, 'id' | 'display_name' | 'avatar_url'>> & { username: string };
type StatusMessage = { type: 'success' | 'error'; text: string };
const exceptionKeys = ['avatar_visibility', 'profile_visibility', 'presence_visibility', 'group_invites'] as const;

export const usePrivacySettings = (isActive: boolean) => {
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
    if (!isActive) {
      setOpenSelect(null);
      return;
    }
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


  return { translations, currentUsername, privacySettings, isLoadingPrivacy, isUpdatingPrivacy, isUpdatingExceptions, isLookingUpUser, status, setStatus, openSelect, setOpenSelect, activeExceptionKey, setActiveExceptionKey, collapsedExceptionKeys, setCollapsedExceptionKeys, exceptionDrafts, setExceptionDrafts, debouncedSearch, searchData, isSearchingUsers, dmCandidates, visibilityLabel, handlePrivacyChange, handleExceptionListChange, handleAddException };
};
