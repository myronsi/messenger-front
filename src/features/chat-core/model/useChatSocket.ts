import { useRealtimeEvents, useRealtimeStatus } from '@/shared/api/realtimeSession';
import { isChatEvent, type ChatServerEvent } from './socketEvents';
import type { Id } from '@/shared/lib/ids';
import { isServerId } from '@/shared/lib/ids';

export { RECONNECT_ATTEMPTS_BEFORE_ERROR } from '@/shared/api/realtime';

interface ChatSocketOptions {
  chatId: Id;
  onEvent: (event: ChatServerEvent) => void;
  // Called when reconnecting keeps failing (reconnecting goes on in the background).
  onConnectionFailed: () => void;
  // Called when the connection is back after a drop, to load what was missed meanwhile.
  onReconnected?: () => void;
}

// A chat's view of the user's one WebSocket (src/shared/api/realtime.ts): its events, and the connection
// coming back.
export const useChatSocket = ({ chatId, onEvent, onConnectionFailed, onReconnected }: ChatSocketOptions) => {
  useRealtimeEvents((event) => {
    if (isServerId(chatId) && isChatEvent(event, chatId)) onEvent(event);
  });
  useRealtimeStatus((status, { reconnected, failed }) => {
    if (!isServerId(chatId)) return;
    if (status === 'open' && reconnected) onReconnected?.();
    if (status === 'closed' && failed) onConnectionFailed();
  });
};
