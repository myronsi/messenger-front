import { useMemo } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useGetGroupChatsQuery, useGetOneOnOneChatsQuery } from '@/entities/chat';
import type { ChatLastMessage } from '@/entities/message';
import { useGetBlockedUsersQuery } from '@/entities/user';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { plainEmoji } from '@/shared/lib/customEmoji';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { selfName } from '@/shared/lib/selfName';
import { parseUtcDate } from '@/shared/utils/dateFormatters';

export interface ForwardTarget {
  id: EntityId;
  name: string;
  handle: string;
  avatarUrl: string;
  type: 'one-on-one' | 'group';
  lastMessage?: ChatLastMessage | null;
  isPinned: boolean;
  pinPosition: number;
}

const activityOf = (target: ForwardTarget) => (target.lastMessage?.timestamp ? parseUtcDate(target.lastMessage.timestamp).getTime() : 0);

export const sortForwardTargets = (targets: ForwardTarget[]) => [...targets].sort((a, b) => {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  if (a.isPinned && a.pinPosition !== b.pinPosition) return a.pinPosition - b.pinPosition;
  return activityOf(b) - activityOf(a);
});

export const matchesForwardQuery = (target: ForwardTarget, query: string) => {
  const needle = query.trim().toLowerCase();
  return !needle || plainEmoji(target.name).toLowerCase().includes(needle) || target.handle.toLowerCase().includes(needle);
};

export const useForwardTargets = (open: boolean, username: string, query: string, translations: Translations) => {
  const { data: directChatsData, isLoading: isLoadingDirect } = useGetOneOnOneChatsQuery(username, { skip: !open || !username });
  const { data: groupChatsData, isLoading: isLoadingGroups } = useGetGroupChatsQuery(username, { skip: !open || !username });
  const { data: blockedUsersData } = useGetBlockedUsersQuery(undefined, { skip: !open });

  const all = useMemo(() => {
    const blocked = new Set((blockedUsersData?.users || []).map((user) => user.username.toLowerCase()));
    const direct: ForwardTarget[] = (directChatsData?.chats || [])
      .filter((chat) => isPersistedId(chat.id) && !chat.pending_approval_request && !chat.interlocutor_deleted
        && !blocked.has(chat.interlocutor_name.toLowerCase()))
      .map((chat) => {
        const name = chat.interlocutor_display_name || chat.interlocutor_name;
        return {
          id: chat.id, name: chat.interlocutor_name.toLowerCase() === username.toLowerCase() ? selfName(name, translations) : name,
          handle: chat.interlocutor_name,
          avatarUrl: resolveMediaUrl(chat.avatar_url, DEFAULT_AVATAR), type: 'one-on-one' as const, lastMessage: chat.last_message,
          isPinned: !!chat.is_pinned, pinPosition: chat.pin_position ?? 0,
        };
      });
    const groups: ForwardTarget[] = (groupChatsData?.groups || []).map((group) => ({
      id: group.chat_id, name: group.name, handle: '', avatarUrl: resolveMediaUrl(group.avatar_url, DEFAULT_GROUP_AVATAR),
      type: 'group' as const, lastMessage: group.last_message, isPinned: !!group.is_pinned, pinPosition: group.pin_position ?? 0,
    }));
    return sortForwardTargets([...direct, ...groups]);
  }, [blockedUsersData?.users, directChatsData?.chats, groupChatsData?.groups, translations, username]);

  const targets = useMemo(() => all.filter((target) => matchesForwardQuery(target, query)), [all, query]);
  return { targets, isLoading: isLoadingDirect || isLoadingGroups };
};
