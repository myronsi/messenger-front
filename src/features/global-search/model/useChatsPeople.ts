import { useEffect, useState } from 'react';
import type { Chat } from '@/entities/message';
import { useSearchUsersQuery } from '@/entities/user';
import { useSearchPublicGroupsQuery } from '@/entities/group';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { matchingChats } from './hitDisplay';

const MAX_ROWS = 6;
const PEOPLE_DEBOUNCE_MS = 250;

export const useChatsPeople = (query: string, chats: Chat[], translations: Translations) => {
  const text = query.trim().replace(/^@/, '');
  const [debounced, setDebounced] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), PEOPLE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);
  const settled = debounced === text;
  const { currentData: people, isFetching: fetchingPeople } = useSearchUsersQuery(debounced, { skip: debounced.length < 2 });
  const { currentData: groups = [], isFetching: fetchingGroups } = useSearchPublicGroupsQuery(debounced, {
    skip: debounced.length < 2 || debounced.length > 64,
  });
  const foundChats = matchingChats(chats, query, translations);
  const known = new Set(foundChats.filter((chat) => chat.type === 'one-on-one').map((chat) => chat.name.toLocaleLowerCase()));
  const users = settled ? (people?.users ?? []).filter((user) => !known.has(user.username.toLocaleLowerCase())).slice(0, MAX_ROWS) : [];
  const publicGroups = settled ? groups.filter((preview) => !!preview.group.public_name).slice(0, MAX_ROWS) : [];
  return {
    chats: foundChats,
    users,
    publicGroups,
    loading: !settled || !!fetchingPeople || !!fetchingGroups,
    empty: !foundChats.length && !users.length && !publicGroups.length,
  };
};

export type ChatsPeople = ReturnType<typeof useChatsPeople>;
