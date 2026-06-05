import { Message } from '@/entities/message';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
export type { MessageHistoryResponse } from './history';

const BASE_URL = import.meta.env.VITE_BASE_URL;

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
  return `${BASE_URL}${avatarUrl}`;
};

export const normalizeHistoryMessage = (rawMessage: any): Message => {
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

export const normalizeHistoryMessages = (messages: unknown[] = []) => (
  messages.map((message) => normalizeHistoryMessage(message))
);

export const prependUniqueMessages = (currentMessages: Message[], olderMessages: Message[]) => {
  const existingIds = new Set(currentMessages.map((message) => message.id));
  return [
    ...olderMessages.filter((message) => !existingIds.has(message.id)),
    ...currentMessages,
  ];
};

export const mergeFreshHistoryMessages = (currentMessages: Message[], freshMessages: Message[]) => {
  if (freshMessages.length === 0) {
    return currentMessages.filter((message) => message.id < 0);
  }

  const freshIds = new Set(freshMessages.map((message) => message.id));
  const currentById = new Map(currentMessages.map((message) => [message.id, message]));
  const oldestFreshId = freshMessages[0].id;
  const olderMessages = currentMessages.filter((message) => (
    message.id > 0 &&
    message.id < oldestFreshId &&
    !freshIds.has(message.id)
  ));
  const pendingMessages = currentMessages.filter((message) => message.id < 0);
  const mergedFreshMessages = freshMessages.map((message) => {
    const current = currentById.get(message.id);
    return current
      ? {
          ...message,
          is_own: current.is_own || message.is_own,
          delivery_error: current.delivery_error || message.delivery_error,
        }
      : message;
  });

  return [
    ...olderMessages,
    ...mergedFreshMessages,
    ...pendingMessages,
  ];
};
