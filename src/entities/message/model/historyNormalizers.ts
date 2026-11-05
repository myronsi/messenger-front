import { isPersistedId, compareIds } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import type { Message } from './types';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
export type { MessageHistoryResponse } from './history';



const parseJsonArray = <T>(value: unknown, fallback: T[]): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || !value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const parseFileContent = (content: unknown) => {
  if (typeof content !== 'string') return content;

  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
};

const normalizeAvatarUrl = (avatarUrl: unknown) => {
  if (typeof avatarUrl !== 'string' || !avatarUrl) return DEFAULT_AVATAR;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  return resolveMediaUrl(avatarUrl);
};

// A history row as returned by the API: JSON columns may arrive as strings and optional fields may be missing.
export type RawHistoryMessage = Omit<Message, 'type' | 'content' | 'reactions' | 'read_by' | 'reply_to' | 'avatar_url'> & {
  type?: Message['type'];
  content: unknown;
  reactions?: unknown;
  read_by?: unknown;
  reply_to?: EntityId | null;
  avatar_url?: unknown;
};

export const normalizeHistoryMessage = (rawMessage: RawHistoryMessage): Message => {
  const type = rawMessage.type || 'message';

  return {
    ...rawMessage,
    sender_id: rawMessage.sender_id,
    avatar_url: normalizeAvatarUrl(rawMessage.avatar_url),
    reply_to: rawMessage.reply_to || null,
    type,
    content: type === 'file' ? parseFileContent(rawMessage.content) : rawMessage.content,
    reactions: parseJsonArray(rawMessage.reactions, []),
    read_by: parseJsonArray(rawMessage.read_by, []),
  };
};

export const normalizeHistoryMessages = (messages: RawHistoryMessage[] = []) => (
  messages.map((message) => normalizeHistoryMessage(message))
);

// Server IDs can exceed Number.MAX_SAFE_INTEGER. Pending sends keep their local order.
export const sortMessages = (messages: Message[]): Message[] => [
  ...messages.filter(message => isPersistedId(message.id)).sort((a, b) => compareIds(a.id, b.id)),
  ...messages.filter(message => !isPersistedId(message.id)),
];

export const prependUniqueMessages = (currentMessages: Message[], olderMessages: Message[]) => {
  const existingIds = new Set(currentMessages.map((message) => message.id));
  return sortMessages([
    ...olderMessages.filter((message) => !existingIds.has(message.id)),
    ...currentMessages,
  ]);
};

// Live messages can already sit at the end of a window that was trimmed, so the page that fills
// the gap is merged by id instead of simply appended.
export const appendUniqueMessages = (currentMessages: Message[], newerMessages: Message[]) => {
  const existingIds = new Set(currentMessages.map((message) => message.id));
  const merged = [
    ...currentMessages,
    ...newerMessages.filter((message) => !existingIds.has(message.id)),
  ];
  const confirmed = merged.filter((message) => isPersistedId(message.id));
  const isOrdered = confirmed.every((message, index) => index === 0 || compareIds(confirmed[index - 1].id, message.id) < 0);
  if (isOrdered) return sortMessages(merged);
  return [...confirmed.sort((a, b) => compareIds(a.id, b.id)), ...merged.filter((message) => !isPersistedId(message.id))];
};

// Drops the newest confirmed messages beyond `limit`; unsent (negative id) messages are kept.
export const trimNewestMessages = (messages: Message[], limit: number) => {
  const confirmedCount = messages.filter((message) => isPersistedId(message.id)).length;
  if (confirmedCount <= limit) return null;
  let toDrop = confirmedCount - limit;
  const kept: Message[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (toDrop > 0 && isPersistedId(messages[index].id)) toDrop -= 1;
    else kept.push(messages[index]);
  }
  kept.reverse();
  const newest = [...kept].reverse().find((message) => isPersistedId(message.id));
  return { messages: kept, newestId: newest?.id ?? null };
};

// Refreshing a window updates known rows without discarding server messages
// received by another page or over realtime while the request was in flight.
export const mergeFreshHistoryMessages = (currentMessages: Message[], freshMessages: Message[]) => {
  const byId = new Map(currentMessages.map(message => [String(message.id), message]));
  for (const message of freshMessages) {
    const current = byId.get(String(message.id));
    byId.set(String(message.id), current ? {
      ...message,
      client_temp_id: current.client_temp_id ?? message.client_temp_id,
      is_own: current.is_own || message.is_own,
      delivery_error: current.delivery_error || message.delivery_error,
      is_deleting: current.is_deleting,
      is_live: current.is_live || message.is_live,
    } : message);
  }
  return sortMessages([...byId.values()]);
};
