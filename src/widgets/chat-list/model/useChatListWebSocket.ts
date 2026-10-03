import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import { getChatWebSocketUrl } from '@/shared/api/webSocketUrl';
import { handleChatListWebSocketMessage } from './chatListWebSocketHandlers';
import type { ChatOverrideMap, ChatListModal, ChatsListComponentProps, PresenceMap, WebSocketMessage } from './types';

interface UseChatListWebSocketParams {
  token: string | null | undefined;
  username: string;
  activeChatId?: number;
  activeChatName?: string;
  onChatOpen: ChatsListComponentProps['onChatOpen'];
  onChatDeleted?: (chatId: number) => void;
  currentUserId?: number;
  refetch: () => void;
  refetchRequestInbox: () => void;
  chatsByIdRef: React.MutableRefObject<Record<number, Chat>>;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setPresenceByUsername: Dispatch<SetStateAction<PresenceMap>>;
  setModal: (modal: ChatListModal | null) => void;
}

// Owns the chat-list WebSocket connection lifecycle (connect/reconnect on
// token change, teardown on unmount) and forwards parsed messages to the
// pure message-handling function.
export function useChatListWebSocket(params: UseChatListWebSocketParams) {
  const {
    token, username, activeChatId, activeChatName, onChatOpen, onChatDeleted, currentUserId,
    refetch, refetchRequestInbox, chatsByIdRef, setChatOverrides, setPresenceByUsername, setModal,
  } = params;

  const wsRef = useRef<WebSocket | null>(null);
  const activeChatIdRef = useRef(activeChatId);
  const activeChatNameRef = useRef(activeChatName);
  const usernameRef = useRef(username);
  const onChatOpenRef = useRef(onChatOpen);
  const currentUserIdRef = useRef<number | undefined>(currentUserId);
  const onChatDeletedRef = useRef(onChatDeleted);
  const refetchRef = useRef(refetch);
  const refetchRequestInboxRef = useRef(refetchRequestInbox);

  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { activeChatNameRef.current = activeChatName; }, [activeChatName]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { onChatOpenRef.current = onChatOpen; }, [onChatOpen]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { onChatDeletedRef.current = onChatDeleted; }, [onChatDeleted]);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);
  useEffect(() => { refetchRequestInboxRef.current = refetchRequestInbox; }, [refetchRequestInbox]);

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeoutId: NodeJS.Timeout | null = null;

    const connectWebSocket = async () => {
      if (!isMounted) return;

      // Check if WebSocket is already connected or connecting
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket already connected or connecting for chat list');
        return;
      }

      console.log('Connecting WebSocket for chat list');
      try {
        const url = await getChatWebSocketUrl(0);
        if (!isMounted) return;
        wsRef.current = new WebSocket(url);
      } catch (e) {
        console.error('Failed to create WebSocket for chat list', e);
        if (isMounted && token) {
          reconnectTimeoutId = setTimeout(() => { if (isMounted) void connectWebSocket(); }, 5000);
        }
        return;
      }

      wsRef.current.onopen = () => {
        if (!isMounted) return;
        console.log('WebSocket successfully connected for chat list');
        refetchRequestInboxRef.current();
      };

      wsRef.current.onmessage = (event) => {
        if (!isMounted) return;
        let parsedData: WebSocketMessage;
        try {
          parsedData = JSON.parse(event.data);
        } catch (error) {
          console.error('Received non-JSON message:', event.data);
          return;
        }

        console.log('WebSocket message received:', parsedData);

        handleChatListWebSocketMessage(parsedData, {
          usernameRef,
          activeChatIdRef,
          activeChatNameRef,
          onChatOpenRef,
          onChatDeletedRef,
          currentUserIdRef,
          chatsByIdRef,
          refetchRef,
          refetchRequestInboxRef,
          setChatOverrides,
          setPresenceByUsername,
          setModal,
        });
      };

      wsRef.current.onclose = (event) => {
        if (!isMounted) return;
        console.log('WebSocket disconnected for chat list');
        // Only reconnect if it wasn't a clean close and component is still mounted
        if (event.code !== 1000 && event.code !== 1001 && token) {
          reconnectTimeoutId = setTimeout(() => {
            if (isMounted && token) connectWebSocket();
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        if (!isMounted) return;
        console.error('WebSocket error for chat list:', error);
        // Don't show modal for transient errors - let reconnection logic handle it
      };
    };

    if (token) {
      connectWebSocket();
    }

    return () => {
      isMounted = false;
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, 'Component unmounted');
        } catch (e) {
          console.warn('Error while closing chat list WebSocket', e);
        }
        wsRef.current = null;
      }
    };
    // token is the only reconnect trigger; setters/refs stay stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
