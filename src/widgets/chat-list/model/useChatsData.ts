import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Chat } from '@/entities/message';
import {
  useGetApprovalRequestInboxQuery,
  useGetOneOnOneChatsQuery,
  useGetGroupChatsQuery,
  useCreateChatMutation,
  useGetCurrentUserQuery,
  useSetChatPinnedMutation,
  useMarkChatReadMutation,
} from '@/app/api/messengerApi';
import { parseUtcDate } from '@/shared/utils/dateFormatters';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { BASE_URL } from './types';
import type { ChatOverrideMap, PresenceMap } from './types';

// Coordinates RTK Query data sources (one-on-one chats, group chats, request
// inbox, current user) and merges them with live presence/override state
// (kept fresh by the WebSocket hook) into the final sorted chat list.
export function useChatsData(username: string) {
  const {
    data: oneOnOneChatsData,
    error: oneOnOneError,
    isLoading: isLoadingOneOnOne,
    refetch: refetchOneOnOne,
  } = useGetOneOnOneChatsQuery(username);

  const {
    data: groupChatsData,
    error: groupError,
    isLoading: isLoadingGroups,
    refetch: refetchGroups,
  } = useGetGroupChatsQuery(username);

  const [createChat, { isLoading: isCreatingChat }] = useCreateChatMutation();
  const [setChatPinned] = useSetChatPinnedMutation();
  const [markChatRead] = useMarkChatReadMutation();
  const { data: requestInbox, refetch: refetchRequestInbox } = useGetApprovalRequestInboxQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: currentUserData } = useGetCurrentUserQuery();

  const isLoading = isLoadingOneOnOne || isLoadingGroups;
  const error = oneOnOneError || groupError;

  // Use useCallback to stabilize the refetch function reference
  const refetch = useCallback(() => {
    refetchOneOnOne();
    refetchGroups();
  }, [refetchOneOnOne, refetchGroups]);

  const [presenceByUsername, setPresenceByUsername] = useState<PresenceMap>({});
  const [chatOverrides, setChatOverrides] = useState<ChatOverrideMap>({});

  // Transform the API data to match the Chat interface with proper avatar URLs
  const chats: Chat[] = React.useMemo(() => {
    const withOverrides = (chat: Chat): Chat => ({
      ...chat,
      ...(chatOverrides[chat.id] || {}),
    });

    const oneOnOneChats: Chat[] = (oneOnOneChatsData?.chats || []).map((chat) => withOverrides({
      ...(presenceByUsername[chat.interlocutor_name] || {}),
      id: chat.id,
      name: chat.interlocutor_name,
      interlocutor_name: chat.interlocutor_name,
      display_name: chat.interlocutor_display_name || chat.interlocutor_name,
      avatar_url: chat.avatar_url ? `${BASE_URL}${chat.avatar_url}` : DEFAULT_AVATAR,
      is_online: presenceByUsername[chat.interlocutor_name]?.is_online ?? chat.interlocutor_is_online ?? false,
      last_seen: presenceByUsername[chat.interlocutor_name]?.last_seen ?? chat.interlocutor_last_seen ?? null,
      interlocutor_deleted: chat.interlocutor_deleted || false,
      type: 'one-on-one' as const,
      last_message: chat.last_message || null,
      unread_count: chat.unread_count || 0,
      first_unread_message_id: chat.first_unread_message_id || null,
      is_pinned: !!chat.is_pinned,
      pending_approval_request: !!chat.pending_approval_request,
      pending_request_id: chat.pending_request_id,
    }));

    const groupChats: Chat[] = (groupChatsData?.groups || []).map((group) => withOverrides({
      id: group.chat_id,
      name: group.name,
      interlocutor_name: group.name,
      display_name: group.name,
      avatar_url: group.avatar_url ? `${BASE_URL}${group.avatar_url}` : DEFAULT_GROUP_AVATAR,
      is_online: false,
      last_seen: null,
      interlocutor_deleted: false,
      type: 'group' as const,
      last_message: group.last_message || null,
      unread_count: group.unread_count || 0,
      first_unread_message_id: group.first_unread_message_id || null,
      is_pinned: !!group.is_pinned,
    }));

    return [...oneOnOneChats, ...groupChats]
      .map((chat, index) => ({ chat, index }))
      .sort((a, b) => {
        const aPinned = !!a.chat.is_pinned;
        const bPinned = !!b.chat.is_pinned;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        const aTime = a.chat.last_message?.timestamp ? parseUtcDate(a.chat.last_message.timestamp).getTime() : 0;
        const bTime = b.chat.last_message?.timestamp ? parseUtcDate(b.chat.last_message.timestamp).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.index - b.index;
      })
      .map(({ chat }) => chat);
  }, [oneOnOneChatsData, groupChatsData, presenceByUsername, chatOverrides]);

  const chatsByIdRef = useRef<Record<number, Chat>>({});
  useEffect(() => {
    chatsByIdRef.current = chats.reduce<Record<number, Chat>>((acc, chat) => {
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
