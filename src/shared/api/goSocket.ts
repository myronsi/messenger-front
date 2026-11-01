import type { ClientEvent, ServerEvent } from '@myronsi/messenger-api';
import type { EntityId } from './entityId';
import { groupModel, messageModel } from './goModels';

export const isGoApi = () => /\/api\/v2\/?$/.test(String(import.meta.env.VITE_BASE_URL));

interface OutgoingEvent {
  type: string;
  client_temp_id?: EntityId; message_id?: EntityId; reply_to?: EntityId | null;
  content?: string; reaction?: string; emoji?: string; is_typing?: boolean;
}
export const goClientEvent = (raw: OutgoingEvent, chatId: EntityId): ClientEvent => {
  const envelope = { type: raw.type, chat_id: String(chatId), client_temp_id: String(raw.client_temp_id ?? crypto.randomUUID()) };
  const messageId = raw.message_id === undefined ? undefined : String(raw.message_id);
  let data: Record<string, unknown>;
  switch (raw.type) {
    case 'message': data = { type: 'text', content: raw.content, reply_to: raw.reply_to ? String(raw.reply_to) : null }; break;
    case 'edit': data = { message_id: messageId, content: raw.content }; break;
    case 'delete': data = { message_id: messageId, scope: 'everyone' }; break;
    case 'reaction_add': case 'reaction_remove': data = { message_id: messageId, emoji: raw.reaction || raw.emoji }; break;
    case 'resend': data = { message_id: messageId }; break;
    case 'typing': data = { is_typing: raw.is_typing }; break;
    default: throw new Error(`Unsupported outgoing event: ${raw.type}`);
  }
  return { ...envelope, data } as ClientEvent;
};

export const adaptSocketSender = (socket: WebSocket, chatId: EntityId) => {
  if (!isGoApi()) return socket;
  const send = socket.send.bind(socket);
  socket.send = (payload) => {
    if (typeof payload !== 'string') throw new Error('Expected JSON WebSocket event');
    send(JSON.stringify(goClientEvent(JSON.parse(payload), chatId)));
  };
  return socket;
};

export const goServerEvent = (event: ServerEvent, chatId: EntityId): unknown => {
  if (event.chat_id !== null && event.chat_id !== String(chatId)) return null;
  switch (event.type) {
    case 'message': {
      const message = messageModel(event.data.message);
      return { ...message, type: message.type, username: message.sender, sender_username: message.sender_username,
        data: { message_id: message.id, chat_id: event.chat_id, reply_to: message.reply_to,
          client_temp_id: message.client_temp_id, ...(typeof message.content === 'string' ? { content: message.content } : message.content) } };
    }
    case 'edit': return { type: 'edit', message_id: event.data.message.id, new_content: event.data.message.content, timestamp: event.data.message.edited_at };
    case 'delete': return { type: 'delete', message_id: event.data.message_id };
    case 'reaction_add': case 'reaction_remove': return { type: event.type, message_id: event.data.message_id, user_id: event.data.reaction.user_id, reaction: event.data.reaction.emoji };
    case 'read': return { type: 'is_read', message_id: event.data.message_id, user_id: event.data.user_id, read_at: event.data.read_at };
    case 'error': return { type: 'error', message: event.data.message || event.data.code, message_id: event.client_temp_id };
    case 'group_updated': return { type: 'group_updated', group: groupModel(event.data.group) };
    case 'chat_deleted': return { type: 'chat_deleted', chat_id: event.chat_id };
    default: return null;
  }
};
