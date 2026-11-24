import type { Dispatch, SetStateAction } from 'react';
import type { ServerEvent } from '@myronsi/messenger-api';
import { compareIds, isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import { lastMessageModel } from '@/shared/api/goModels';
import type { Chat, ChatLastMessage } from '@/entities/message';
import type { ChatOverride, ChatOverrideMap, PresenceMap } from './types';

export interface ChatListEventContext {
  chats: Record<EntityId, Chat>;
  currentUserId?: EntityId;
  activeChatId?: EntityId;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setPresenceByUsername: Dispatch<SetStateAction<PresenceMap>>;
}

type Frame<T extends ServerEvent['type']> = Extract<ServerEvent, { type: T }>;

const same = (a: EntityId | null | undefined, b: EntityId | null | undefined) => a != null && b != null && String(a) === String(b);

const newestKnown = (...ids: (EntityId | null | undefined)[]) => ids.reduce<EntityId>(
  (best, id) => (id != null && isPersistedId(id) && compareIds(id, best) > 0 ? id : best),
  '0',
);

const toLastMessage = (message: Frame<'message'>['data']['message']) => lastMessageModel(message) as unknown as ChatLastMessage;

const patchChat = (ctx: ChatListEventContext, chatId: EntityId, update: (existing: ChatOverride, chat: Chat) => ChatOverride | null) => {
  const chat = ctx.chats[chatId];
  if (!chat) return;
  ctx.setChatOverrides((prev) => {
    const existing = prev[chatId] || {};
    const next = update(existing, chat);
    return next ? { ...prev, [chatId]: next } : prev;
  });
};

const onMessage = (frame: Frame<'message'>, ctx: ChatListEventContext) => {
  if (!ctx.chats[frame.chat_id]) return false;
  const message = frame.data.message;
  const counts = !same(message.sender?.id, ctx.currentUserId) && !same(frame.chat_id, ctx.activeChatId);
  const mentioned = counts && (message.mentions_all === true || (message.mentions ?? []).some((id) => same(id, ctx.currentUserId)));
  patchChat(ctx, frame.chat_id, (existing, chat) => {
    const known = newestKnown(existing.last_counted_message_id, existing.last_message?.id, chat.last_message?.id);
    if (compareIds(message.id, known) <= 0) return null;
    const unread = existing.unread_count ?? chat.unread_count ?? 0;
    const mentions = existing.unread_mentions_count ?? chat.unread_mentions_count ?? 0;
    const firstUnread = existing.first_unread_message_id ?? chat.first_unread_message_id ?? null;
    return {
      ...existing,
      last_message: toLastMessage(message),
      last_counted_message_id: message.id,
      unread_count: counts ? unread + 1 : unread,
      unread_mentions_count: mentioned ? mentions + 1 : mentions,
      first_unread_message_id: counts ? firstUnread ?? message.id : firstUnread,
    };
  });
  return true;
};

const onEdit = (frame: Frame<'edit'>, ctx: ChatListEventContext) => {
  const message = frame.data.message;
  patchChat(ctx, frame.chat_id, (existing, chat) => {
    const last = existing.last_message ?? chat.last_message;
    if (!last || !same(last.id, message.id)) return null;
    return { ...existing, last_message: { ...toLastMessage(message), read_by: last.read_by } };
  });
  return true;
};

const onDelete = (frame: Frame<'delete'>, ctx: ChatListEventContext) => {
  const last = ctx.chats[frame.chat_id]?.last_message;
  return !last || !same(last.id, frame.data.message_id);
};

const onRead = (frame: Frame<'read'>, ctx: ChatListEventContext) => {
  const chat = ctx.chats[frame.chat_id];
  if (!chat) return true;
  const { message_id: readUpTo, user_id: reader, read_at: readAt } = frame.data;
  if (same(reader, ctx.currentUserId)) {
    const last = chat.last_message;
    if (last && isPersistedId(last.id) && compareIds(readUpTo, last.id) < 0) return false;
    patchChat(ctx, frame.chat_id, (existing) => ({ ...existing, unread_count: 0, unread_mentions_count: 0, first_unread_message_id: null }));
    return true;
  }
  patchChat(ctx, frame.chat_id, (existing, base) => {
    const last = existing.last_message ?? base.last_message;
    if (!last || !isPersistedId(last.id) || compareIds(readUpTo, last.id) < 0) return null;
    const readBy = (last.read_by ?? []).filter((read) => !same(read.user_id, reader));
    return { ...existing, last_message: { ...last, read_by: [...readBy, { user_id: reader, read_at: readAt }] } };
  });
  return true;
};

const onPresence = (frame: Frame<'presence'>, ctx: ChatListEventContext) => {
  const chat = Object.values(ctx.chats).find((item) => item.type === 'one-on-one' && same(item.interlocutor_id, frame.data.user_id));
  if (!chat) return;
  ctx.setPresenceByUsername((prev) => ({
    ...prev,
    [chat.interlocutor_name]: { is_online: frame.data.is_online, last_seen: frame.data.last_seen },
  }));
};

export function applyChatListEvent(frame: ServerEvent, ctx: ChatListEventContext): boolean {
  switch (frame.type) {
    case 'message': return onMessage(frame, ctx);
    case 'edit': return onEdit(frame, ctx);
    case 'delete': return onDelete(frame, ctx);
    case 'read': return onRead(frame, ctx);
    case 'presence':
      onPresence(frame, ctx);
      return true;
    default: return false;
  }
}
