import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import { getMediaSrc } from './types';
import type { ChatOverrideMap, ChatListModal, ChatsListComponentProps, PresenceMap, WebSocketMessage } from './types';

export interface ChatListWebSocketContext {
  usernameRef: MutableRefObject<string>;
  activeChatIdRef: MutableRefObject<number | undefined>;
  activeChatNameRef: MutableRefObject<string | undefined>;
  onChatOpenRef: MutableRefObject<ChatsListComponentProps['onChatOpen']>;
  onChatDeletedRef: MutableRefObject<((chatId: number) => void) | undefined>;
  currentUserIdRef: MutableRefObject<number | undefined>;
  chatsByIdRef: MutableRefObject<Record<number, Chat>>;
  refetchRef: MutableRefObject<() => void>;
  refetchRequestInboxRef: MutableRefObject<() => void>;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setPresenceByUsername: Dispatch<SetStateAction<PresenceMap>>;
  setModal: (modal: ChatListModal | null) => void;
}

// Applies a single parsed chat-list WebSocket message to the relevant piece
// of state (overrides, presence, modal) or triggers a refetch/navigation.
export function handleChatListWebSocketMessage(parsedData: WebSocketMessage, ctx: ChatListWebSocketContext) {
  const {
    usernameRef, activeChatIdRef, activeChatNameRef, onChatOpenRef, onChatDeletedRef,
    currentUserIdRef, chatsByIdRef, refetchRef, refetchRequestInboxRef, setChatOverrides,
    setPresenceByUsername, setModal,
  } = ctx;

  switch (parsedData.type) {
    case 'approval_request_created':
      refetchRequestInboxRef.current();
      refetchRef.current();
      break;
    case 'chat_created':
      if (parsedData.chat?.chat_id) {
        const chat = parsedData.chat;
        const ownUsername = usernameRef.current.toLowerCase();
        const user1 = chat.user1?.toLowerCase();
        const user2 = chat.user2?.toLowerCase();
        const otherUsername = user1 === ownUsername
          ? chat.user2
          : user2 === ownUsername
          ? chat.user1
          : null;
        const activeId = activeChatIdRef.current;
        const activeName = activeChatNameRef.current?.toLowerCase();

        if (
          typeof activeId === 'number' &&
          activeId <= 0 &&
          otherUsername &&
          activeName === otherUsername.toLowerCase()
        ) {
          const otherAvatarUrl = user1 === ownUsername ? chat.user2_avatar_url : chat.user1_avatar_url;
          onChatOpenRef.current(
            chat.chat_id,
            otherUsername,
            false,
            'one-on-one',
            otherUsername,
            undefined,
            undefined,
            null,
            getMediaSrc(otherAvatarUrl),
          );
        }
      }
      refetchRef.current();
      break;
    case 'group_created':
    case 'group_updated':
      // Refetch chats when a new chat is created
      refetchRef.current();
      break;
    case 'chat_deleted':
      if (parsedData.chat_id && onChatDeletedRef.current) {
        onChatDeletedRef.current(parsedData.chat_id);
      }
      // Refetch chats when a chat is deleted
      refetchRef.current();
      break;
    case 'chat_list_message':
      if (parsedData.chat_id && parsedData.last_message) {
        setChatOverrides((prev) => {
          const chatId = parsedData.chat_id as number;
          const existing = prev[chatId] || {};
          const baseChat = chatsByIdRef.current[chatId];
          const existingUnreadCount = existing.unread_count ?? baseChat?.unread_count ?? 0;
          const existingFirstUnreadId = existing.first_unread_message_id ?? baseChat?.first_unread_message_id ?? null;
          const isOwnMessage = parsedData.sender_id === currentUserIdRef.current;
          const shouldCountUnread = !isOwnMessage && parsedData.chat_id !== activeChatIdRef.current;
          const nextUnreadCount = shouldCountUnread ? existingUnreadCount + 1 : existingUnreadCount;
          return {
            ...prev,
            [chatId]: {
              ...existing,
              last_message: parsedData.last_message || null,
              unread_count: isOwnMessage || parsedData.chat_id === activeChatIdRef.current ? existingUnreadCount : nextUnreadCount,
              first_unread_message_id: shouldCountUnread
                ? existingFirstUnreadId || parsedData.last_message?.id || null
                : existingFirstUnreadId,
            },
          };
        });
      }
      break;
    case 'chat_list_read':
      if (parsedData.chat_id) {
        setChatOverrides((prev) => {
          const chatId = parsedData.chat_id as number;
          const existing = prev[chatId] || {};
          const baseChat = chatsByIdRef.current[chatId];
          const lastMessage = existing.last_message ?? baseChat?.last_message ?? null;
          const readerUserId = parsedData.reader_user_id ?? parsedData.user_id;
          const nextLastMessage = lastMessage && lastMessage.id === parsedData.message_id && readerUserId
            ? {
                ...lastMessage,
                read_by: [
                  ...(lastMessage.read_by || []).filter((read) => read.user_id !== readerUserId),
                  { user_id: readerUserId, read_at: parsedData.timestamp || new Date().toISOString() },
                ],
              }
            : lastMessage;

          return {
            ...prev,
            [chatId]: {
              ...existing,
              last_message: nextLastMessage,
              unread_count: readerUserId === currentUserIdRef.current
                ? parsedData.unread_count ?? 0
                : existing.unread_count ?? baseChat?.unread_count ?? 0,
              first_unread_message_id: readerUserId === currentUserIdRef.current
                ? parsedData.first_unread_message_id ?? null
                : existing.first_unread_message_id ?? baseChat?.first_unread_message_id ?? null,
            },
          };
        });
      }
      break;
    case 'chat_read_batch':
      if (parsedData.chat_id) {
        setChatOverrides((prev) => {
          const chatId = parsedData.chat_id as number;
          const existing = prev[chatId] || {};
          const baseChat = chatsByIdRef.current[chatId];
          const lastMessage = existing.last_message ?? baseChat?.last_message ?? null;
          const readMessageIds = parsedData.message_ids || [];
          const readAt = parsedData.read_at || parsedData.timestamp || new Date().toISOString();
          const readerUserId = parsedData.reader_user_id ?? parsedData.user_id;
          const nextLastMessage = lastMessage && readerUserId && readMessageIds.includes(lastMessage.id)
            ? {
                ...lastMessage,
                read_by: [
                  ...(lastMessage.read_by || []).filter((read) => read.user_id !== readerUserId),
                  { user_id: readerUserId, read_at: readAt },
                ],
              }
            : lastMessage;

          return {
            ...prev,
            [chatId]: {
              ...existing,
              last_message: nextLastMessage,
              unread_count: readerUserId === currentUserIdRef.current
                ? parsedData.unread_count ?? 0
                : existing.unread_count ?? baseChat?.unread_count ?? 0,
              first_unread_message_id: readerUserId === currentUserIdRef.current
                ? parsedData.first_unread_message_id ?? null
                : existing.first_unread_message_id ?? baseChat?.first_unread_message_id ?? null,
            },
          };
        });
      }
      break;
    case 'chat_list_delete':
      if (parsedData.chat_id) {
        setChatOverrides((prev) => {
          const chatId = parsedData.chat_id as number;
          const existing = prev[chatId] || {};
          const baseChat = chatsByIdRef.current[chatId];

          return {
            ...prev,
            [chatId]: {
              ...existing,
              last_message: parsedData.last_message ?? null,
              unread_count: parsedData.unread_count ?? existing.unread_count ?? baseChat?.unread_count ?? 0,
              first_unread_message_id: parsedData.first_unread_message_id ?? null,
            },
          };
        });
      }
      break;
    case 'edit':
      if (parsedData.message_id) {
        setChatOverrides((prev) => {
          const updateLastMessage = (chatId: number, existing: ChatOverrideMap[number]) => {
            const baseChat = chatsByIdRef.current[chatId];
            const lastMessage = existing.last_message ?? baseChat?.last_message ?? null;
            if (!lastMessage || lastMessage.id !== parsedData.message_id) return existing;

            return {
              ...existing,
              last_message: {
                ...lastMessage,
                content: parsedData.new_content ?? lastMessage.content,
                edited_at: parsedData.timestamp || new Date().toISOString(),
              },
            };
          };

          if (parsedData.chat_id) {
            const chatId = parsedData.chat_id as number;
            const existing = prev[chatId] || {};
            const updated = updateLastMessage(chatId, existing);
            if (updated === existing) return prev;
            return {
              ...prev,
              [chatId]: updated,
            };
          }

          const next = { ...prev };
          let changed = false;
          const chatIds = new Set<number>([
            ...Object.keys(chatsByIdRef.current).map(Number),
            ...Object.keys(prev).map(Number),
          ]);

          chatIds.forEach((chatId) => {
            const existing = prev[chatId] || {};
            const updated = updateLastMessage(chatId, existing);
            if (updated !== existing) {
              next[chatId] = updated;
              changed = true;
            }
          });

          return changed ? next : prev;
        });
      }
      break;
    case 'presence_update':
      if (parsedData.username) {
        setPresenceByUsername((prev) => ({
          ...prev,
          [parsedData.username as string]: {
            is_online: !!parsedData.is_online,
            last_seen: parsedData.last_seen || null,
          },
        }));
      }
      break;
    case 'error':
      setModal({
        type: 'error',
        message: parsedData.message || 'Unknown error',
      });
      break;
  }
}
