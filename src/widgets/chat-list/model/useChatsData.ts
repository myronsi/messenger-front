import { directChatsSnapshot, groupChatsSnapshot, useChatSnapshot } from '@/shared/api/chatSnapshots';
import type { EntityId } from '@/shared/api/entityId';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import { useGetApprovalRequestInboxQuery, useGetOneOnOneChatsQuery, useGetGroupChatsQuery, useCreateChatMutation, useSetChatPinnedMutation, useMarkChatReadMutation } from '@/entities/chat';
import { useGetCurrentUserQuery } from '@/features/profile';
import { parseUtcDate } from '@/shared/utils/dateFormatters';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

import type { ChatOverrideMap, PresenceMap } from './types';

// Coordinates RTK Query data sources (one-on-one chats, group chats, request
// inbox, current user) and merges them with live presence/override state
// (kept fresh by the WebSocket hook) into the final sorted chat list.
export function useChatsData(username: string) {
  const {
    currentData: liveDirectChats,
    startedTimeStamp: oneOnOneStartedAt,
    fulfilledTimeStamp: oneOnOneFulfilledAt,
    error: oneOnOneError,
    isLoading: isLoadingOneOnOne,
    refetch: refetchOneOnOne,
  } = useGetOneOnOneChatsQuery(username, { refetchOnMountOrArgChange: 10, refetchOnFocus: true, refetchOnReconnect: true });

  const {
    currentData: liveGroupChats,
    startedTimeStamp: groupStartedAt,
    fulfilledTimeStamp: groupFulfilledAt,
    error: groupError,
    isLoading: isLoadingGroups,
    refetch: refetchGroups,
  } = useGetGroupChatsQuery(username, { refetchOnMountOrArgChange: 10, refetchOnFocus: true, refetchOnReconnect: true });

  const cachedDirect = useChatSnapshot<typeof liveDirectChats>(liveDirectChats ? null : directChatsSnapshot);
  const cachedGroups = useChatSnapshot<typeof liveGroupChats>(liveGroupChats ? null : groupChatsSnapshot);
  const denied = [oneOnOneError, groupError].some(error =>
    error && 'status' in error && (error.status === 401 || error.status === 403));
  const oneOnOneChatsData = liveDirectChats ?? (denied ? undefined : cachedDirect);
  const groupChatsData = liveGroupChats ?? (denied ? undefined : cachedGroups);

  const [createChat, { isLoading: isCreatingChat }] = useCreateChatMutation();
  const [setChatPinned] = useSetChatPinnedMutation();
  const [markChatRead] = useMarkChatReadMutation();
  const { data: requestInbox, refetch: refetchRequestInbox } = useGetApprovalRequestInboxQuery();
  const { data: currentUserData } = useGetCurrentUserQuery();

  const isLoading = !oneOnOneChatsData && !groupChatsData && (isLoadingOneOnOne || isLoadingGroups);
  const error = denied || (!oneOnOneChatsData && !groupChatsData) ? oneOnOneError || groupError : undefined;

  // Use useCallback to stabilize the refetch function reference
  const refetch = useCallback(() => Promise.all([refetchOneOnOne(), refetchGroups()]), [refetchOneOnOne, refetchGroups]);

  const [presenceByUsername, setPresenceByUsername] = useState<PresenceMap>({});
  const [chatOverrides, setRawChatOverrides] = useState<ChatOverrideMap>({});

  // Stamps every override that changed so stale ones can be told apart from live ones.
  const setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>> = useCallback((action) => {
    setRawChatOverrides((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next === prev) return prev;
      const now = Date.now();
      const stamped: ChatOverrideMap = {};
      Object.keys(next).forEach((key) => {
        const id = key;
        stamped[id] = next[id] === prev[id] ? next[id] : { ...next[id], updated_at: now };
      });
      return stamped;
    });
  }, []);

  // Server data is authoritative: once a fetch lands, drop overrides written before that
  // request started (it already reflects them). Newer ones are live events and are kept.
  const dropOverridesOlderThan = useCallback((chatIds: EntityId[], startedAt: number | undefined) => {
    if (!startedAt || chatIds.length === 0) return;
    const ids = new Set(chatIds.map(String));
    setRawChatOverrides((prev) => {
      let changed = false;
      const next: ChatOverrideMap = {};
      Object.keys(prev).forEach((key) => {
        const id = key;
        if (ids.has(id) && (prev[id].updated_at ?? 0) < startedAt) {
          changed = true;
        } else {
          next[id] = prev[id];
        }
      });
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    dropOverridesOlderThan((oneOnOneChatsData?.chats || []).map((chat) => chat.id), oneOnOneStartedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oneOnOneFulfilledAt, dropOverridesOlderThan]);

  useEffect(() => {
    dropOverridesOlderThan((groupChatsData?.groups || []).map((group) => group.chat_id), groupStartedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFulfilledAt, dropOverridesOlderThan]);

  // Transform the API data to match the Chat interface with proper avatar URLs
  const chats: Chat[] = React.useMemo(() => {
    const withOverrides = (chat: Chat): Chat => {
      const { last_counted_message_id, updated_at, ...override } = chatOverrides[chat.id] || {};
      return { ...chat, ...override };
    };

    const oneOnOneChats: Chat[] = (oneOnOneChatsData?.chats || []).map((chat) => withOverrides({
      ...(presenceByUsername[chat.interlocutor_name] || {}),
      id: chat.id,
      name: chat.interlocutor_name,
      interlocutor_name: chat.interlocutor_name,
      display_name: chat.interlocutor_display_name || chat.interlocutor_name,
      avatar_url: resolveMediaUrl(chat.avatar_url, DEFAULT_AVATAR),
      is_online: presenceByUsername[chat.interlocutor_name]?.is_online ?? chat.interlocutor_is_online ?? false,
      last_seen: presenceByUsername[chat.interlocutor_name]?.last_seen ?? chat.interlocutor_last_seen ?? null,
      interlocutor_deleted: chat.interlocutor_deleted || false,
      type: 'one-on-one' as const,
      last_message: chat.last_message || null,
      unread_count: chat.unread_count || 0,
      first_unread_message_id: chat.first_unread_message_id || null,
      is_pinned: !!chat.is_pinned,
      pin_position: chat.pin_position ?? null,
      is_archived: !!chat.is_archived,
      is_saved: !!username && chat.interlocutor_name.toLowerCase() === username.toLowerCase(),
      pending_approval_request: !!chat.pending_approval_request,
      pending_request_id: chat.pending_request_id,
    }));

    const groupChats: Chat[] = (groupChatsData?.groups || []).map((group) => withOverrides({
      id: group.chat_id,
      name: group.name,
      interlocutor_name: group.name,
      display_name: group.name,
      avatar_url: resolveMediaUrl(group.avatar_url, DEFAULT_GROUP_AVATAR),
      is_online: false,
      last_seen: null,
      interlocutor_deleted: false,
      type: 'group' as const,
      last_message: group.last_message || null,
      unread_count: group.unread_count || 0,
      first_unread_message_id: group.first_unread_message_id || null,
      is_pinned: !!group.is_pinned,
      pin_position: group.pin_position ?? null,
      is_archived: !!group.is_archived,
      my_role: group.my_role ?? null,
    }));

    return [...oneOnOneChats, ...groupChats]
      .map((chat, index) => ({ chat, index }))
      .sort((a, b) => {
        const aPinned = !!a.chat.is_pinned;
        const bPinned = !!b.chat.is_pinned;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        if (aPinned) {
          const aPosition = a.chat.pin_position ?? Number.MAX_SAFE_INTEGER;
          const bPosition = b.chat.pin_position ?? Number.MAX_SAFE_INTEGER;
          if (aPosition !== bPosition) return aPosition - bPosition;
        }
        const aTime = a.chat.last_message?.timestamp ? parseUtcDate(a.chat.last_message.timestamp).getTime() : 0;
        const bTime = b.chat.last_message?.timestamp ? parseUtcDate(b.chat.last_message.timestamp).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.index - b.index;
      })
      .map(({ chat }) => chat);
  }, [oneOnOneChatsData, groupChatsData, presenceByUsername, chatOverrides, username]);

  const chatsByIdRef = useRef<Record<EntityId, Chat>>({});
  useEffect(() => {
    chatsByIdRef.current = chats.reduce<Record<EntityId, Chat>>((acc, chat) => {
      acc[chat.id] = chat;
      return acc;
    }, {});
  }, [chats]);

  return {
    chats,
    isLoading,
    error,
    refetch,
    requestInbox,
    refetchRequestInbox,
    currentUserData,
    createChat,
    isCreatingChat,
    setChatPinned,
    markChatRead,
    oneOnOneChatsData,
    chatsByIdRef,
    presenceByUsername,
    setPresenceByUsername,
    chatOverrides,
    setChatOverrides,
  };
}
