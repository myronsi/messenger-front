import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useEffect, useRef } from 'react';
import { realtime, type SocketSender } from '@/shared/api/realtime';
import { goClientEvent, goServerEvent } from '@/shared/api/goSocket';
import type { ChatTransport } from './types';
import { parseServerEvent, type ServerEvent } from './socketEvents';

export const RECONNECT_ATTEMPTS_BEFORE_ERROR = 5;
interface ChatSocketOptions {
  chatId: EntityId;
  token: string;
  transport: ChatTransport;
  onEvent: (event: ServerEvent, socket: SocketSender) => void;
  onConnectionFailed: () => void;
  onReconnected?: () => void;
  onOpened?: () => void;
}

// A conversation subscribes to the user's shared stream and owns only its sender.
export const useChatSocket = (options: ChatSocketOptions) => {
  const latest = useRef(options);
  latest.current = options;
  const { chatId, token, transport } = options;
  const { wsRef, messageQueueRef, connectionRetryKey } = transport;
  const isSignedIn = Boolean(token);
  useEffect(() => {
    if (!isSignedIn || !isPersistedId(chatId)) return;
    const release = realtime.subscribe({
      onOpen: ({ reconnected }) => {
        while (messageQueueRef.current.length && sender.readyState === WebSocket.OPEN) {
          const queued = messageQueueRef.current[0];
          try { sender.send(JSON.stringify(queued)); messageQueueRef.current.shift(); } catch { break; }
        }
        if (reconnected) latest.current.onReconnected?.();
        else latest.current.onOpened?.();
      },
      onEvent: frame => {
        const raw = goServerEvent(frame, chatId);
        const event = raw ? parseServerEvent(raw) : null;
        if (event) latest.current.onEvent(event, sender);
      },
      onStatus: (status, attempts) => {
        if (status === 'reconnecting' && attempts === RECONNECT_ATTEMPTS_BEFORE_ERROR) latest.current.onConnectionFailed();
      },
      onDeliveryTimeout: (tempId, targetChat) => {
        if (targetChat === String(chatId)) latest.current.onEvent({ type: 'error', message_id: tempId,
          message: 'Message delivery could not be confirmed. Retry when connected.' }, sender);
      },
    });
    const sender = realtime.sender(payload => JSON.stringify(goClientEvent(JSON.parse(payload), chatId)), release);
    wsRef.current = sender;
    realtime.reconnectNow();
    return () => { release(); if (wsRef.current === sender) wsRef.current = null; };
  }, [chatId, isSignedIn, wsRef, messageQueueRef]);
  useEffect(() => { if (connectionRetryKey) realtime.reconnectNow(); }, [connectionRetryKey]);
};
