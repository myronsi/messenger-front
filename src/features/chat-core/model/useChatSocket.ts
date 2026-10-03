import { useEffect, useRef } from 'react';
import { getChatWebSocketUrl } from '@/shared/api/webSocketUrl';
import type { ChatTransport } from './types';
import type { SocketEvent } from './messageUpdates';

export const MAX_WEBSOCKET_RECONNECT_ATTEMPTS = 5;

interface ChatSocketOptions {
  chatId: number;
  token: string;
  transport: ChatTransport;
  onEvent: (event: SocketEvent, socket: WebSocket) => void;
  onConnectionFailed: () => void;
}

// Opens the chat WebSocket, flushes queued outgoing messages once connected and reconnects with backoff.
export const useChatSocket = ({ chatId, token, transport, onEvent, onConnectionFailed }: ChatSocketOptions) => {
  const { wsRef, messageQueueRef, connectionRetryKey } = transport;
  const onEventRef = useRef(onEvent);
  const onConnectionFailedRef = useRef(onConnectionFailed);
  onEventRef.current = onEvent;
  onConnectionFailedRef.current = onConnectionFailed;

  useEffect(() => {
    if (!token || chatId <= 0) return undefined;
    let isMounted = true;
    let reconnectAttempts = 0;
    let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = () => {
      reconnectAttempts += 1;
      if (reconnectAttempts >= MAX_WEBSOCKET_RECONNECT_ATTEMPTS) {
        onConnectionFailedRef.current();
        return;
      }
      reconnectTimeoutId = setTimeout(() => { if (isMounted) void connect(); }, 1000 * reconnectAttempts);
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

      let socket: WebSocket;
      try {
        const url = await getChatWebSocketUrl(chatId);
        if (!isMounted) return;
        socket = new WebSocket(url);
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        if (isMounted) scheduleReconnect();
        return;
      }
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) {
          try { socket.close(1000, 'Component unmounted'); } catch { /* socket already closed */ }
          if (wsRef.current === socket) wsRef.current = null;
          return;
        }
        reconnectAttempts = 0;
        flushQueue(socket);
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        let parsed: SocketEvent;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          console.error('Received non-JSON chat message:', event.data);
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
        if (event.code !== 1000 && event.code !== 1001 && event.code !== 1008) scheduleReconnect();
      };
    };

    void connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      const socket = wsRef.current;
      wsRef.current = null;
      if (socket) {
        try { socket.close(1000, 'Component unmounted'); } catch { /* socket already closed */ }
      }
    };
  }, [chatId, token, connectionRetryKey, wsRef, messageQueueRef]);
};