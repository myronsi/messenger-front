import { asApiError } from '@/shared/lib/apiError';
import { useEffect, useMemo, useState } from 'react';
import { PrivacyExceptionEffect, PrivacyExceptionKey, PrivacySettings, useGetCurrentUserQuery, useGetPrivacySettingsQuery, useUpdatePrivacyExceptionsMutation, useUpdatePrivacySettingsMutation } from '@/features/profile';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';
import { useLazyGetUserByUsernameQuery, useSearchUsersQuery } from '@/entities/user';
import type { User } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';

type PrivacySettingKey = Exclude<keyof PrivacySettings, 'privacy_exceptions'>;
type PrivacyCandidate = Partial<Pick<User, 'id' | 'display_name' | 'avatar_url'>> & { username: string };
type StatusMessage = { type: 'success' | 'error'; text: string };
type ExceptionDraftKey = `${PrivacyExceptionKey}:${PrivacyExceptionEffect}`;

export const usePrivacySettings = (isActive: boolean) => {
  const { translations } = useLanguage();
  const { data: currentUser } = useGetCurrentUserQuery(undefined, { skip: !isActive });
  const currentUsername = currentUser?.username || '';
  const { data: savedSettings, isLoading: isLoadingPrivacy } = useGetPrivacySettingsQuery(undefined, { skip: !isActive });
  const { data: dmChatsData } = useGetOneOnOneChatsQuery(currentUsername, { skip: !isActive || !currentUsername });
  const [updatePrivacySettings, { isLoading: isUpdatingPrivacy }] = useUpdatePrivacySettingsMutation();
  const [updatePrivacyExceptions, { isLoading: isUpdatingExceptions }] = useUpdatePrivacyExceptionsMutation();
  const [lookupUser, { isFetching: isLookingUpUser }] = useLazyGetUserByUsernameQuery();
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [activeExceptionKey, setActiveExceptionKey] = useState<PrivacyExceptionKey | null>(null);
  const [exceptionDrafts, setExceptionDrafts] = useState<Record<PrivacyExceptionKey, string>>({
    avatar_visibility: '',
    profile_visibility: '',
    presence_visibility: '',
    group_invites: '',
    direct_messages: '',
    search_visibility: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [settingDrafts, setSettingDrafts] = useState<Partial<Record<PrivacySettingKey, string | boolean>>>({});
  const [listDrafts, setListDrafts] = useState<Partial<Record<ExceptionDraftKey, User[]>>>({});
  const hasUnsavedChanges = Object.keys(settingDrafts).length > 0 || Object.keys(listDrafts).length > 0;

  const privacySettings = useMemo<PrivacySettings | undefined>(() => {
    if (!savedSettings) return savedSettings;
    const exceptions = { ...savedSettings.privacy_exceptions };
    (Object.entries(listDrafts) as Array<[ExceptionDraftKey, User[]]>).forEach(([draftKey, users]) => {
      const [key, effect] = draftKey.split(':') as [PrivacyExceptionKey, PrivacyExceptionEffect];
      exceptions[key] = { ...exceptions[key], [effect]: users };
    });
    return { ...savedSettings, ...settingDrafts, privacy_exceptions: exceptions } as PrivacySettings;
  }, [listDrafts, savedSettings, settingDrafts]);

  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(null), status.type === 'success' ? 2200 : 4000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (!isActive) setActiveExceptionKey(null);
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

  const handlePrivacyChange = (key: PrivacySettingKey, value: string | boolean) => {
    setSettingDrafts((drafts) => {
      const next = { ...drafts };
      if (savedSettings?.[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const handleExceptionListChange = (key: PrivacyExceptionKey, effect: PrivacyExceptionEffect, users: User[]) => {
    const names = (list: User[]) => list.map((user) => user.username.toLowerCase()).sort((a, b) => a.localeCompare(b)).join(',');
    const opposite: PrivacyExceptionEffect = effect === 'allow' ? 'deny' : 'allow';
    const listed = new Set(users.map((user) => user.username.toLowerCase()));
    const oppositeUsers = privacySettings?.privacy_exceptions?.[key]?.[opposite] || [];
    const keptOpposite = oppositeUsers.filter((user) => !listed.has(user.username.toLowerCase()));
    const putDraft = (drafts: Partial<Record<ExceptionDraftKey, User[]>>, draftEffect: PrivacyExceptionEffect, list: User[]) => {
      const saved = savedSettings?.privacy_exceptions?.[key]?.[draftEffect] || [];
      if (names(saved) === names(list)) delete drafts[`${key}:${draftEffect}`];
      else drafts[`${key}:${draftEffect}`] = list;
    };
    setListDrafts((drafts) => {
      const next = { ...drafts };
      putDraft(next, effect, users);
      if (keptOpposite.length !== oppositeUsers.length) putDraft(next, opposite, keptOpposite);
      return next;
    });
  };

  const discardChanges = () => {
    setSettingDrafts({});
    setListDrafts({});
  };

  const saveChanges = async () => {
    setStatus(null);
    const lists = (Object.entries(listDrafts) as Array<[ExceptionDraftKey, User[]]>).map(([draftKey, users]) => {
      const [settingKey, effect] = draftKey.split(':') as [PrivacyExceptionKey, PrivacyExceptionEffect];
      const saved = (savedSettings?.privacy_exceptions?.[settingKey]?.[effect] || []).map((user) => user.username);
      const draft = users.map((user) => user.username);
      const inDraft = new Set(draft.map((name) => name.toLowerCase()));
      const inSaved = new Set(saved.map((name) => name.toLowerCase()));
      const narrowed = effect === 'deny'
        ? [...saved, ...draft.filter((name) => !inSaved.has(name.toLowerCase()))]
        : saved.filter((name) => inDraft.has(name.toLowerCase()));
      return { settingKey, effect, saved, narrowed, draft };
    });
    const sameNames = (a: string[], b: string[]) => a.length === b.length && a.every((name, index) => name.toLowerCase() === b[index].toLowerCase());
    const putList = async ({ settingKey, effect }: (typeof lists)[number], current: string[], next: string[]) => {
      if (!sameNames(next, current)) await updatePrivacyExceptions({ settingKey, effect, usernames: next }).unwrap();
    };
    try {
      for (const list of lists) await putList(list, list.saved, list.narrowed);
      if (Object.keys(settingDrafts).length) await updatePrivacySettings(settingDrafts as Partial<PrivacySettings>).unwrap();
      for (const list of [...lists].sort((a, b) => (a.effect === b.effect ? 0 : a.effect === 'deny' ? -1 : 1))) {
        await putList(list, list.narrowed, list.draft);
      }
      discardChanges();
      setStatus({ type: 'success', text: translations.saved || 'Saved' });
      return true;
    } catch (caught) {
      const error = asApiError(caught);
      setStatus({ type: 'error', text: error?.data?.detail || 'Failed to update privacy settings' });
      return false;
    }
  };

  const handleAddException = async (key: PrivacyExceptionKey, effect: PrivacyExceptionEffect, username: string) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || trimmedUsername.toLowerCase() === currentUsername.toLowerCase()) return;
    const currentUsers = privacySettings?.privacy_exceptions?.[key]?.[effect] || [];
    if (currentUsers.some((user) => user.username.toLowerCase() === trimmedUsername.toLowerCase())) return;

    try {
      const resolvedUser = await lookupUser(trimmedUsername).unwrap();
      handleExceptionListChange(key, effect, [...currentUsers, resolvedUser]);
      setExceptionDrafts((drafts) => ({ ...drafts, [key]: '' }));
      setDebouncedSearch('');
    } catch (caught) {
      const error = asApiError(caught);
      setStatus({ type: 'error', text: error?.data?.detail || translations.userNotFound || 'User not found' });
    }
  };


  return {
    translations, currentUsername, privacySettings, isLoadingPrivacy, isUpdatingPrivacy,
    isUpdatingExceptions, isLookingUpUser, status, setStatus, activeExceptionKey,
    setActiveExceptionKey, exceptionDrafts,
    setExceptionDrafts, debouncedSearch, searchData, isSearchingUsers, dmCandidates, visibilityLabel,
    handlePrivacyChange, handleExceptionListChange, handleAddException, hasUnsavedChanges, saveChanges, discardChanges,
  };
};
