import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import { toChatLastMessage } from '@/entities/message';
import { toDirectChatItem } from '@/entities/chat';
import type { ServerEvent } from '@/shared/api/realtime';
import { usernameOf } from '@/shared/lib/userDirectory';
import { getMediaSrc } from './types';
import type { ChatOverrideMap, ChatListModal, ChatsListComponentProps, PresenceMap } from './types';
import type { Id } from '@/shared/lib/ids';
import { compareIds, maxId } from '@/shared/lib/ids';

export interface ChatListWebSocketContext {
  usernameRef: MutableRefObject<string>;
  activeChatIdRef: MutableRefObject<Id | undefined>;
  activeChatNameRef: MutableRefObject<string | undefined>;
  onChatOpenRef: MutableRefObject<ChatsListComponentProps['onChatOpen']>;
  onChatDeletedRef: MutableRefObject<((chatId: Id) => void) | undefined>;
  currentUserIdRef: MutableRefObject<Id | undefined>;
  chatsByIdRef: MutableRefObject<Record<Id, Chat>>;
  refetchRef: MutableRefObject<() => void>;
  refetchRequestInboxRef: MutableRefObject<() => void>;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setPresenceByUsername: Dispatch<SetStateAction<PresenceMap>>;
  setModal: (modal: ChatListModal | null) => void;
}

// Applies one event of the user's socket to the chat list: overrides of the list entries, presence, or a
// refetch when chats appear or disappear.
export function handleChatListWebSocketMessage(event: ServerEvent, ctx: ChatListWebSocketContext) {
  const {
    activeChatIdRef, activeChatNameRef, onChatOpenRef, onChatDeletedRef,
    currentUserIdRef, chatsByIdRef, refetchRef, refetchRequestInboxRef, setChatOverrides, setPresenceByUsername,
  } = ctx;

  switch (event.type) {
    case 'approval_request_created':
      refetchRequestInboxRef.current();
      refetchRef.current();
      break;

    case 'chat_created': {
      // The chat the user is drafting (opened from a profile, not created yet) now exists: open it for real.
      const { chat } = event.data;
      const activeName = activeChatNameRef.current?.toLowerCase();
      if (chat.type === 'direct' && chat.peer && !activeChatIdRef.current && activeName === chat.peer.username.toLowerCase()) {
        const item = toDirectChatItem(chat);
        onChatOpenRef.current(
          chat.id, item.interlocutor_name, false, 'one-on-one', item.interlocutor_display_name,
          item.interlocutor_is_online, item.interlocutor_last_seen, null, getMediaSrc(item.avatar_url),
        );
      }
      refetchRef.current();
      break;
    }

    case 'group_created':
    case 'group_updated':
      refetchRef.current();
      break;

    case 'chat_deleted':
      onChatDeletedRef.current?.(event.chat_id);
      refetchRef.current();
      break;

    // The server's own view of the entry: last message, unread count and pin.
    case 'chat_list_update': {
      const { chat } = event.data;
      if (!chatsByIdRef.current[chat.id]) {
        refetchRef.current();
        break;
      }
      setChatOverrides((prev) => ({
        ...prev,
        [chat.id]: {
          ...(prev[chat.id] || {}),
          last_message: chat.last_message ? toChatLastMessage(chat.last_message) : null,
          last_counted_message_id: chat.last_message?.id ?? prev[chat.id]?.last_counted_message_id,
          unread_count: chat.id === activeChatIdRef.current ? 0 : chat.unread_count,
          is_pinned: chat.is_pinned,
          first_unread_message_id: null,
        },
      }));
      break;
    }

    // A new message also moves the entry at once, before its chat_list_update.
    case 'message': {
      const message = event.data.message;
      const chatId = event.chat_id;
      if (!chatsByIdRef.current[chatId]) {
        refetchRef.current();
        break;
      }
      setChatOverrides((prev) => {
        const existing = prev[chatId] || {};
        const baseChat = chatsByIdRef.current[chatId];
        const knownMessageId = maxId([existing.last_counted_message_id, existing.last_message?.id ?? baseChat?.last_message?.id]);
        // Replays and messages already counted change nothing.
        if (knownMessageId && compareIds(message.id, knownMessageId) <= 0) return prev;
        const isOwn = message.sender?.id === currentUserIdRef.current;
        const isOpen = chatId === activeChatIdRef.current;
        const unread = existing.unread_count ?? baseChat?.unread_count ?? 0;
        return {
          ...prev,
          [chatId]: {
            ...existing,
            last_message: toChatLastMessage(message),
            last_counted_message_id: message.id,
            unread_count: isOwn || isOpen ? unread : unread + 1,
          },
        };
      });
      break;
    }

    case 'presence': {
      const username = usernameOf(event.data.user_id);
      if (!username) break;
      setPresenceByUsername((prev) => ({
        ...prev,
        [username]: { is_online: event.data.is_online, last_seen: event.data.last_seen },
      }));
      break;
    }

    default:
      break;
  }
}
