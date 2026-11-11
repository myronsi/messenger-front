import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import { sortMessages, type FileMessageContent, type Message, type ReactionInfo } from '@/entities/message';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { NewMessageEvent } from './socketEvents';

export interface ReaderInfo {
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

const isSameSender = (a: Message, b: Message) => (!!a.sender_id && a.sender_id === b.sender_id) || a.sender === b.sender;

export const buildMessageFromSocketEvent = (
  event: NewMessageEvent,
  context: { currentUserId: EntityId; username: string }
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
  content: event.type === 'file' ? event.data as FileMessageContent : (event.data.content ?? ''),
  timestamp: event.timestamp,
  avatar_url: resolveMediaUrl(event.avatar_url),
  reply_to: event.data.reply_to || null,
  reply_preview: event.reply_preview,
  is_system: event.is_system,
  system_event: event.system_event,
  sticker: event.sticker,
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
  onTempIdResolved?: (tempId: EntityId) => void
): Message[] => {
  const existingIndex = previous.findIndex((message) => message.id === incoming.id);
  if (existingIndex !== -1) {
    const copy = [...previous];
    copy[existingIndex] = incoming;
    return copy;
  }

  // A server echo may arrive out of order, or have the same content/name as a
  // different send. Only its client-generated identifier identifies the draft.
  const pendingIndex = incoming.client_temp_id == null ? -1 : previous.findIndex(message =>
    !isPersistedId(message.id) && isSameSender(message, incoming) &&
    String(message.client_temp_id ?? message.id) === String(incoming.client_temp_id)
  );
  if (pendingIndex !== -1) {
    const copy = [...previous];
    const pending = copy[pendingIndex];
    onTempIdResolved?.(pending.id);
    if (pending.local_object_url) {
      window.setTimeout(() => URL.revokeObjectURL(pending.local_object_url as string), 1000);
    }
    copy[pendingIndex] = { ...incoming, client_temp_id: pending.client_temp_id ?? pending.id, is_own: pending.is_own || incoming.is_own };
    return sortMessages(copy);
  }
  return sortMessages([...previous, incoming]);
};

export const abandonUnsentMessages = (
  previous: Message[],
  releasedUploads: Set<string>,
  errors: { notConfirmed: string; uploadNotSent: string }
): Message[] => {
  let changed = false;
  const next = previous.map((message) => {
    if (isPersistedId(message.id) || !message.is_own) return message;
    if (releasedUploads.has(String(message.id))) {
      changed = true;
      return { ...message, upload_status: 'lost' as const, delivery_error: errors.uploadNotSent };
    }
    if (message.type === 'file' || message.upload_status || message.delivery_error) return message;
    changed = true;
    return { ...message, delivery_error: errors.notConfirmed };
  });
  return changed ? next : previous;
};

export const editableText = (message: Message) => (
  typeof message.content === 'string' ? message.content : message.content?.caption || ''
);

export const applyMessageEdit = (previous: Message[], messageId: EntityId, content: Message['content'] | null, editedAt?: string): Message[] =>
  previous.map((message) => {
    if (message.id !== messageId) return message;
    const nextContent = typeof message.content !== 'string' && message.content && (typeof content === 'string' || content == null)
      ? { ...message.content, caption: content || undefined }
      : content ?? message.content;
    return { ...message, content: nextContent, edited_at: editedAt || new Date().toISOString() };
  });

export const addReaction = (previous: Message[], messageId: EntityId, reaction: ReactionInfo): Message[] =>
  previous.map((message) => {
    if (message.id !== messageId) return message;
    const reactions = message.reactions || [];
    if (reactions.some((item) => item.user_id === reaction.user_id && item.reaction === reaction.reaction)) return message;
    return { ...message, reactions: [...reactions, reaction] };
  });

export const removeReaction = (previous: Message[], messageId: EntityId, userId: EntityId, reaction: string): Message[] =>
  previous.map((message) => (
    message.id === messageId
      ? { ...message, reactions: (message.reactions || []).filter((item) => !(item.user_id === userId && item.reaction === reaction)) }
      : message
  ));

export const addReadReceipts = (
  previous: Message[],
  messageIds: EntityId[],
  readerUserId: EntityId,
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
