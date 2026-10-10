import { toAppMessage, type ApiMessage, type Message, type ReactionInfo } from '@/entities/message';
import { unescapeCurlyBraces } from './messageText';
import type { Id } from '@/shared/lib/ids';
import { compareIds, isLocalId, isServerId } from '@/shared/lib/ids';

export interface ReaderInfo {
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

const isSameSender = (a: Message, b: Message) => (!!a.sender_id && a.sender_id === b.sender_id) || a.sender === b.sender;

// buildIncomingMessage maps a message that arrived over the socket.
export const buildIncomingMessage = (message: ApiMessage, currentUserId: Id): Message => ({
  ...toAppMessage(message, currentUserId),
  is_live: true,
});

// Inserts a message received from the server, replacing the optimistic copy (pending text or
// in-progress upload) when there is one. `onTempIdResolved` is called with the replaced optimistic id.
export const mergeIncomingMessage = (
  previous: Message[],
  incoming: Message,
  onTempIdResolved?: (tempId: Id) => void
): Message[] => {
  const existingIndex = previous.findIndex((message) => message.id === incoming.id);
  if (existingIndex !== -1) {
    const copy = [...previous];
    const existing = copy[existingIndex];
    copy[existingIndex] = { ...incoming, client_temp_id: existing.client_temp_id ?? incoming.client_temp_id, is_own: existing.is_own || incoming.is_own };
    return copy;
  }

  // The server echoes the sender's client_temp_id: the optimistic copy (text or upload) is replaced in place.
  const pendingIndex = incoming.client_temp_id
    ? previous.findIndex((message) => isLocalId(message.id) && message.client_temp_id === incoming.client_temp_id)
    : -1;
  if (pendingIndex !== -1) {
    const copy = [...previous];
    const pending = copy[pendingIndex];
    if (pending.local_object_url) {
      window.setTimeout(() => URL.revokeObjectURL(pending.local_object_url as string), 1000);
    }
    onTempIdResolved?.(pending.id);
    copy[pendingIndex] = { ...incoming, is_own: true };
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
    isLocalId(message.id) &&
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

export const applyMessageEdit = (previous: Message[], messageId: Id, content: Message['content'], editedAt?: string): Message[] =>
  previous.map((message) => (
    message.id === messageId
      ? { ...message, content, edited_at: editedAt || new Date().toISOString() }
      : message
  ));

export const addReaction = (previous: Message[], messageId: Id, reaction: ReactionInfo): Message[] =>
  previous.map((message) => {
    if (message.id !== messageId) return message;
    const reactions = message.reactions || [];
    if (reactions.some((item) => item.user_id === reaction.user_id && item.reaction === reaction.reaction)) return message;
    return { ...message, reactions: [...reactions, reaction] };
  });

export const removeReaction = (previous: Message[], messageId: Id, userId: Id, reaction: string): Message[] =>
  previous.map((message) => (
    message.id === messageId
      ? { ...message, reactions: (message.reactions || []).filter((item) => !(item.user_id === userId && item.reaction === reaction)) }
      : message
  ));

export const addReadReceipts = (
  previous: Message[],
  messageIds: Id[],
  readerUserId: Id,
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

// addReadReceiptUpTo records that a user read everything up to and including messageId (the contract's read
// marker): every message of someone else at or before it gets the receipt once.
export const addReadReceiptUpTo = (previous: Message[], messageId: Id, readerUserId: Id, readAt: string): Message[] => {
  if (!readerUserId || !isServerId(messageId)) return previous;
  const ids = previous
    .filter((message) => isServerId(message.id) && compareIds(message.id, messageId) <= 0 && message.sender_id !== readerUserId)
    .map((message) => message.id);
  return addReadReceipts(previous, ids, readerUserId, readAt);
};

// confirmSentMessage swaps an optimistic message's local id for the stored one (the ack of a send), unless the
// message itself already arrived.
export const confirmSentMessage = (previous: Message[], localId: Id, messageId: Id, createdAt: string): Message[] => {
  if (previous.some((message) => message.id === messageId)) {
    return previous.filter((message) => message.id !== localId);
  }
  return previous.map((message) => (message.id === localId
    ? { ...message, id: messageId, timestamp: createdAt, upload_status: undefined, upload_progress: undefined, delivery_error: undefined }
    : message));
};
