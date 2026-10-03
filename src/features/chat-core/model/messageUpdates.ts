import type { Message, ReactionInfo } from '@/entities/message';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { unescapeCurlyBraces } from './messageText';

// Raw WebSocket payloads are loosely typed on purpose: the backend sends several event shapes.
export type SocketEvent = Record<string, any>;

export interface ReaderInfo {
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

const isSameSender = (a: Message, b: Message) => (!!a.sender_id && a.sender_id === b.sender_id) || a.sender === b.sender;

export const buildMessageFromSocketEvent = (
  event: SocketEvent,
  context: { currentUserId: number; username: string }
): Message => ({
  id: event.data.message_id,
  client_temp_id: event.data.client_temp_id ?? null,
  sender_id: event.sender_id,
  is_own: context.currentUserId
    ? event.sender_id === context.currentUserId
    : String(event.sender_username || event.username || '').toLowerCase() === context.username.toLowerCase(),
  is_live: true,
  sender: event.username,
  sender_username: event.sender_username || event.username,
  content: event.type === 'file' ? event.data : event.data.content,
  timestamp: event.timestamp,
  avatar_url: resolveMediaUrl(event.avatar_url),
  reply_to: event.data.reply_to || null,
  is_deleted: event.is_deleted || false,
  delivery_error: event.delivery_error || undefined,
  forwarded_from: event.forwarded_from || null,
  type: event.type,
  reactions: event.reactions || [],
  read_by: event.read_by || [],
});

// Inserts a message received from the server, replacing the optimistic copy (pending text or
// in-progress upload) when there is one. `onTempIdResolved` is called with the replaced optimistic id.
export const mergeIncomingMessage = (
  previous: Message[],
  incoming: Message,
  onTempIdResolved?: (tempId: number) => void
): Message[] => {
  const existingIndex = previous.findIndex((message) => message.id === incoming.id);
  if (existingIndex !== -1) {
    const copy = [...previous];
    copy[existingIndex] = incoming;
    return copy;
  }

  const pendingUploadIndex = previous.findIndex((message) => {
    if (message.upload_status !== 'uploading' || message.type !== 'file' || incoming.type !== 'file') return false;
    if (typeof message.content === 'string' || typeof incoming.content === 'string') return false;
    return isSameSender(message, incoming) &&
      message.content.file_name === incoming.content.file_name &&
      message.content.file_size === incoming.content.file_size;
  });
  if (pendingUploadIndex !== -1) {
    const copy = [...previous];
    const pending = copy[pendingUploadIndex];
    if (pending.local_object_url) {
      window.setTimeout(() => URL.revokeObjectURL(pending.local_object_url as string), 1000);
    }
    copy[pendingUploadIndex] = {
      ...incoming,
      client_temp_id: pending.client_temp_id ?? pending.id,
      is_own: pending.is_own || incoming.is_own,
    };
    return copy;
  }

  const pendingTextIndex = previous.findIndex((message) =>
    message.id < 0 &&
    isSameSender(message, incoming) &&
    typeof message.content === 'string' &&
    typeof incoming.content === 'string' &&
    (message.content === incoming.content || message.content === unescapeCurlyBraces(incoming.content))
  );
  if (pendingTextIndex !== -1) {
    const copy = [...previous];
    const pending = copy[pendingTextIndex];
    onTempIdResolved?.(pending.id);
    copy[pendingTextIndex] = {
      ...incoming,
      client_temp_id: pending.client_temp_id ?? pending.id,
      is_own: pending.is_own || incoming.is_own,
    };
    return copy;
  }

  return [...previous, incoming];
};

export const applyMessageEdit = (previous: Message[], messageId: number, content: Message['content'], editedAt?: string): Message[] =>
  previous.map((message) => (
    message.id === messageId
      ? { ...message, content, edited_at: editedAt || new Date().toISOString() }
      : message
  ));

export const addReaction = (previous: Message[], messageId: number, reaction: ReactionInfo): Message[] =>
  previous.map((message) => {
    if (message.id !== messageId) return message;
    const reactions = message.reactions || [];
    if (reactions.some((item) => item.user_id === reaction.user_id && item.reaction === reaction.reaction)) return message;
    return { ...message, reactions: [...reactions, reaction] };
  });

export const removeReaction = (previous: Message[], messageId: number, userId: number, reaction: string): Message[] =>
  previous.map((message) => (
    message.id === messageId
      ? { ...message, reactions: (message.reactions || []).filter((item) => !(item.user_id === userId && item.reaction === reaction)) }
      : message
  ));

export const addReadReceipts = (
  previous: Message[],
  messageIds: number[],
  readerUserId: number,
  readAt: string,
  reader?: ReaderInfo
): Message[] => {
  if (!messageIds.length || !readerUserId) return previous;
  const readIds = new Set(messageIds);
  return previous.map((message) => {
    if (!readIds.has(message.id)) return message;
    const readBy = message.read_by || [];
    if (readBy.some((read) => read.user_id === readerUserId)) return message;
    return {
      ...message,
      read_by: [...readBy, {
        user_id: readerUserId,
        username: reader?.username,
        display_name: reader?.display_name,
        avatar_url: reader?.avatar_url,
        read_at: readAt,
      }],
    };
  });
};