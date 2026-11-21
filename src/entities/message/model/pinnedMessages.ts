import { compareIds, isPersistedId, type EntityId } from '@/shared/api/entityId';
import type { Message, PinnedMessage, PinnedMessages } from './types';

const sameId = (left: EntityId, right: EntityId) => String(left) === String(right);

const newerFirst = (left: PinnedMessage, right: PinnedMessage) => Date.parse(right.pinned_at) - Date.parse(left.pinned_at);

export const findPin = (state: PinnedMessages | undefined, messageId: EntityId) =>
  state?.items.find((pin) => sameId(pin.message.id, messageId)) ?? null;

export const upsertPin = (state: PinnedMessages, pin: PinnedMessage): PinnedMessages => {
  const existed = !!findPin(state, pin.message.id);
  const items = [...state.items.filter((item) => !sameId(item.message.id, pin.message.id)), pin].sort(newerFirst);
  return { ...state, items, count: state.count === null ? null : state.count + (existed ? 0 : 1) };
};

export const removePin = (state: PinnedMessages, messageId: EntityId): PinnedMessages => {
  if (!findPin(state, messageId)) return state;
  return {
    ...state,
    items: state.items.filter((item) => !sameId(item.message.id, messageId)),
    count: state.count === null ? null : Math.max(0, state.count - 1),
  };
};

export const updatePinnedMessage = (state: PinnedMessages, message: Message): PinnedMessages => {
  if (!findPin(state, message.id)) return state;
  return { ...state, items: state.items.map((pin) => (sameId(pin.message.id, message.id) ? { ...pin, message: { ...pin.message, ...message } } : pin)) };
};

const atOrBefore = (messageId: EntityId, boundary: EntityId) => isPersistedId(messageId) && isPersistedId(boundary)
  && compareIds(messageId, boundary) <= 0;

export const clearPinsUpTo = (state: PinnedMessages, boundary: EntityId): PinnedMessages => {
  const items = state.items.filter((pin) => !atOrBefore(pin.message.id, boundary));
  if (items.length === state.items.length) return state;
  const removed = state.items.length - items.length;
  return { ...state, items, count: state.count === null ? null : Math.max(0, state.count - removed) };
};

export const appendPinPage = (state: PinnedMessages, page: Pick<PinnedMessages, 'items' | 'next_cursor'>): PinnedMessages => {
  const known = new Set(state.items.map((pin) => String(pin.message.id)));
  const items = [...state.items, ...page.items.filter((pin) => !known.has(String(pin.message.id)))];
  return { items, next_cursor: page.next_cursor, count: page.next_cursor ? state.count : items.length };
};

export const isPinnableMessage = (message: Message) => !message.is_system && !message.system_event && !message.is_deleted
  && !message.removed_by_moderation && !message.delivery_error && !message.upload_status && !message.server_kept
  && isPersistedId(message.id);
