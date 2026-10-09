import { useEffect, useRef } from 'react';
import { trackWebSocket } from '@/shared/api/socketRegistry';
import { getChatWebSocketUrl } from '@/shared/api/webSocketUrl';
import { onConnectivityRestored, reconnectDelay, shouldReconnect } from '@/shared/api/reconnect';
import { handleHelloEvent } from '@/shared/api/serverHello';
import type { ChatTransport } from './types';
import { parseServerEvent, type ServerEvent } from './socketEvents';

// After this many failed attempts in a row the user is told, but reconnecting continues in the background.
export const RECONNECT_ATTEMPTS_BEFORE_ERROR = 5;

interface ChatSocketOptions {
  chatId: number;
  token: string;
  transport: ChatTransport;
  onEvent: (event: ServerEvent, socket: WebSocket) => void;
  onConnectionFailed: () => void;
  // Called when the socket reopens after a drop, to load what was missed while it was closed.
  onReconnected?: () => void;
}

// Opens the chat WebSocket, flushes queued outgoing messages once connected and reconnects with backoff.
// The socket authenticates with a one-time ticket, so a token refresh does not need a new connection.
export const useChatSocket = ({ chatId, token, transport, onEvent, onConnectionFailed, onReconnected }: ChatSocketOptions) => {
  const { wsRef, messageQueueRef, connectionRetryKey } = transport;
  const onEventRef = useRef(onEvent);
  const onConnectionFailedRef = useRef(onConnectionFailed);
  onEventRef.current = onEvent;
  onConnectionFailedRef.current = onConnectionFailed;
  const onReconnectedRef = useRef(onReconnected);
  onReconnectedRef.current = onReconnected;
  const openedChatIdRef = useRef<number | null>(null);
  // Survives the effect re-runs caused by requestReconnect(), so a socket the server rejected stays closed.
  const rejectedRef = useRef(false);
  const isSignedIn = Boolean(token);

  useEffect(() => {
    rejectedRef.current = false;
  }, [chatId, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || chatId <= 0 || rejectedRef.current) return undefined;
    let isMounted = true;
    let reconnectAttempts = 0;
    let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let isRequestingTicket = false;

    const scheduleReconnect = () => {
      reconnectAttempts += 1;
      if (reconnectAttempts === RECONNECT_ATTEMPTS_BEFORE_ERROR) onConnectionFailedRef.current();
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = setTimeout(() => { if (isMounted) void connect(); }, reconnectDelay(reconnectAttempts));
    };

    const reconnectNow = () => {
      const current = wsRef.current;
      if (!isMounted || rejectedRef.current || isRequestingTicket || (current && current.readyState !== WebSocket.CLOSED)) return;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
      void connect();
    };

    const flushQueue = (socket: WebSocket) => {
      while (messageQueueRef.current.length > 0 && socket.readyState === WebSocket.OPEN) {
        const queued = messageQueueRef.current.shift();
        if (!queued) continue;
        try {
          socket.send(JSON.stringify(queued));
        } catch (error) {
          console.error('Error sending queued message:', error);
          messageQueueRef.current.unshift(queued);
          break;
        }
      }
    };

    const connect = async () => {
      if (!isMounted) return;
      const current = wsRef.current;
      if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) return;

      if (isRequestingTicket) return;

      let socket: WebSocket;
      isRequestingTicket = true;
      try {
        const url = await getChatWebSocketUrl(chatId);
        if (!isMounted) return;
        socket = trackWebSocket(new WebSocket(url));
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        if (isMounted) scheduleReconnect();
        return;
      } finally {
        isRequestingTicket = false;
      }
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) {
          try { socket.close(1000, 'Component unmounted'); } catch { /* socket already closed */ }
          if (wsRef.current === socket) wsRef.current = null;
          return;
        }
        // Failed attempts before the first open count too: messages may have arrived after the history loaded.
        const isReconnect = openedChatIdRef.current === chatId || reconnectAttempts > 0;
        reconnectAttempts = 0;
        flushQueue(socket);
        openedChatIdRef.current = chatId;
        if (isReconnect) onReconnectedRef.current?.();
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        let raw: unknown;
        try {
          raw = JSON.parse(event.data);
        } catch {
          console.error('Received non-JSON chat message');
          return;
        }
        if (handleHelloEvent(raw)) return;
        const parsed = parseServerEvent(raw);
        if (!parsed) {
          console.error('Ignoring malformed chat event');
          return;
        }
        onEventRef.current(parsed, socket);
      };

      socket.onerror = (error) => {
        if (isMounted) console.error(`WebSocket error for chat ${chatId}:`, error);
      };

      socket.onclose = (event) => {
        if (wsRef.current === socket) wsRef.current = null;
        if (!isMounted) return;
        if (shouldReconnect(socket, event.code)) scheduleReconnect();
        else rejectedRef.current = true;
      };
    };

    void connect();
    const stopWatchingConnectivity = onConnectivityRestored(reconnectNow);

    return () => {
      isMounted = false;
      stopWatchingConnectivity();
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      const socket = wsRef.current;
      wsRef.current = null;
      if (socket) {
        try { socket.close(1000, 'Component unmounted'); } catch { /* socket already closed */ }
      }
    };
  }, [chatId, isSignedIn, connectionRetryKey, wsRef, messageQueueRef]);
};