import { useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import { useRealtimeEvents, useRealtimeStatus } from '@/shared/api/realtimeSession';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { handleChatListWebSocketMessage } from './chatListWebSocketHandlers';
import type { ChatOverrideMap, ChatListModal, ChatsListComponentProps, PresenceMap } from './types';
import type { Id } from '@/shared/lib/ids';

interface UseChatListWebSocketParams {
  username: string;
  activeChatId?: Id;
  activeChatName?: string;
  onChatOpen: ChatsListComponentProps['onChatOpen'];
  onChatDeleted?: (chatId: Id) => void;
  currentUserId?: Id;
  refetch: () => void;
  refetchRequestInbox: () => void;
  chatsByIdRef: React.MutableRefObject<Record<Id, Chat>>;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setPresenceByUsername: Dispatch<SetStateAction<PresenceMap>>;
  setModal: (modal: ChatListModal | null) => void;
}

// The chat list's view of the user's one WebSocket: its events update the list, and after a reconnect the
// list and the request inbox are loaded again (they may have changed meanwhile).
export function useChatListWebSocket(params: UseChatListWebSocketParams) {
  const {
    username, activeChatId, activeChatName, onChatOpen, onChatDeleted, currentUserId,
    refetch, refetchRequestInbox, chatsByIdRef, setChatOverrides, setPresenceByUsername, setModal,
  } = params;

  const activeChatIdRef = useLatestRef(activeChatId);
  const activeChatNameRef = useLatestRef(activeChatName);
  const usernameRef = useLatestRef(username);
  const onChatOpenRef = useLatestRef(onChatOpen);
  const currentUserIdRef = useLatestRef(currentUserId);
  const onChatDeletedRef = useLatestRef(onChatDeleted);
  const refetchRef = useLatestRef(refetch);
  const refetchRequestInboxRef = useLatestRef(refetchRequestInbox);
  const contextRef = useRef({
    usernameRef, activeChatIdRef, activeChatNameRef, onChatOpenRef, onChatDeletedRef, currentUserIdRef,
    chatsByIdRef, refetchRef, refetchRequestInboxRef, setChatOverrides, setPresenceByUsername, setModal,
  });

  useRealtimeEvents((event) => handleChatListWebSocketMessage(event, contextRef.current));

  useRealtimeStatus((status, { reconnected }) => {
    if (status !== 'open') return;
    if (reconnected) refetchRef.current();
    refetchRequestInboxRef.current();
  });
}
