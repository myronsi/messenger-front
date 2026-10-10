import { useEffect, useMemo, useRef } from 'react';
import { bindChat, createRealtimeClient, type ChatRealtime, type RealtimeStatus, type ServerEvent } from './realtime';
import { getWebSocketUrl } from './webSocketUrl';
import type { Id } from '@/shared/lib/ids';

// The app's one connection (src/shared/api/realtime.ts).
export const realtime = createRealtimeClient({ getUrl: getWebSocketUrl });

// useRealtimeSession keeps the connection open while the user is signed in.
export const useRealtimeSession = (isSignedIn: boolean) => {
  useEffect(() => {
    if (!isSignedIn) return undefined;
    realtime.start();
    return () => realtime.stop();
  }, [isSignedIn]);
};

// useRealtimeEvents calls the handler with every server event (the latest handler, without resubscribing).
export const useRealtimeEvents = (handler: (event: ServerEvent) => void) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => realtime.subscribe((event) => handlerRef.current(event)), []);
};

// useRealtimeStatus reports connection changes; `reconnected` means events may have been missed.
export const useRealtimeStatus = (handler: (status: RealtimeStatus, info: { reconnected: boolean; failed: boolean }) => void) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => realtime.onStatus((status, info) => handlerRef.current(status, info)), []);
};

// useChatRealtime is the shared connection bound to one chat.
export const useChatRealtime = (chatId: Id): ChatRealtime => useMemo(() => bindChat(realtime, chatId), [chatId]);
