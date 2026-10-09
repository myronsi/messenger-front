import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import { trackWebSocket } from '@/shared/api/socketRegistry';
import { getChatWebSocketUrl } from '@/shared/api/webSocketUrl';
import { onConnectivityRestored, reconnectDelay, shouldReconnect } from '@/shared/api/reconnect';
import { handleHelloEvent } from '@/shared/api/serverHello';
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

// Owns the chat-list WebSocket connection lifecycle (connect on sign-in, reconnect with backoff,
// teardown on unmount) and forwards parsed messages to the pure message-handling function.
// The socket authenticates with a one-time ticket, so a token refresh does not need a new connection.
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
  const isSignedIn = Boolean(token);

  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { activeChatNameRef.current = activeChatName; }, [activeChatName]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { onChatOpenRef.current = onChatOpen; }, [onChatOpen]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { onChatDeletedRef.current = onChatDeleted; }, [onChatDeleted]);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);
  useEffect(() => { refetchRequestInboxRef.current = refetchRequestInbox; }, [refetchRequestInbox]);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let isMounted = true;
    let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let hasOpened = false;
    let isRequestingTicket = false;
    let isRejected = false;

    const scheduleReconnect = () => {
      reconnectAttempts += 1;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = setTimeout(() => { if (isMounted) void connectWebSocket(); }, reconnectDelay(reconnectAttempts));
    };

    const reconnectNow = () => {
      const current = wsRef.current;
      if (!isMounted || isRejected || isRequestingTicket || (current && current.readyState !== WebSocket.CLOSED)) return;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
      void connectWebSocket();
    };

    const connectWebSocket = async () => {
      if (!isMounted || isRequestingTicket) return;

      // Check if WebSocket is already connected or connecting
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      isRequestingTicket = true;
      try {
        const url = await getChatWebSocketUrl(0);
        if (!isMounted) return;
        wsRef.current = trackWebSocket(new WebSocket(url));
      } catch (e) {
        console.error('Failed to create WebSocket for chat list', e);
        if (isMounted) scheduleReconnect();
        return;
      } finally {
        isRequestingTicket = false;
      }
      const socket = wsRef.current;

      socket.onopen = () => {
        if (!isMounted) return;
        reconnectAttempts = 0;
        refetchRequestInboxRef.current();
        // Last messages and unread counts may have changed while the socket was down.
        if (hasOpened) refetchRef.current();
        hasOpened = true;
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        let parsedData: WebSocketMessage;
        try {
          parsedData = JSON.parse(event.data);
        } catch (error) {
          console.error('Received non-JSON chat list message');
          return;
        }

        if (handleHelloEvent(parsedData)) return;

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

      socket.onclose = (event) => {
        if (wsRef.current === socket) wsRef.current = null;
        if (!isMounted) return;
        if (shouldReconnect(event.code)) scheduleReconnect();
        else isRejected = true;
      };

      socket.onerror = (error) => {
        if (!isMounted) return;
        console.error('WebSocket error for chat list:', error);
        // Don't show modal for transient errors - let reconnection logic handle it
      };
    };

    void connectWebSocket();
    const stopWatchingConnectivity = onConnectivityRestored(reconnectNow);

    return () => {
      isMounted = false;
      stopWatchingConnectivity();
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
    // Signing in or out is the only reconnect trigger; setters/refs stay stable across renders.
  }, [isSignedIn]);
}
