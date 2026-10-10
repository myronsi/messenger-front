import type { ServerEvent } from '@/shared/api/realtime';
import type { Id } from '@/shared/lib/ids';

export type { ServerEvent };

// The events that can belong to a chat: all but the connection-wide ones (hello, presence), whose chat_id is
// always null. ack and error carry the chat of the client event they answer.
export type ChatServerEvent = Exclude<ServerEvent, { chat_id: null }>;

export const isChatEvent = (event: ServerEvent, chatId: Id): event is ChatServerEvent => event.chat_id === chatId;
