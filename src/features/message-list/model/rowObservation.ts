import type { EntityId } from '@/shared/api/entityId';
import type { Message } from '@/entities/message';

export type RowRefs = { [key: string]: HTMLDivElement | null };

export const syncObservedRows = (
  refs: RowRefs,
  rows: Map<Element, string>,
  observe: (element: Element) => void,
  unobserve: (element: Element) => void,
) => {
  const current = new Map<Element, string>();
  for (const id in refs) {
    const element = refs[id];
    if (element) current.set(element, id);
  }
  rows.forEach((_id, element) => {
    if (current.has(element)) return;
    rows.delete(element);
    unobserve(element);
  });
  current.forEach((id, element) => {
    if (!rows.has(element)) observe(element);
    rows.set(element, id);
  });
};

export const isUnreadByMe = (message: Message, userId: EntityId, isOwnMessage: (message: Message) => boolean) => (
  !isOwnMessage(message) && !message.read_by?.some((reader) => reader.user_id === userId)
);

export const unreadVisibleMessageIds = (
  elements: Iterable<Element>,
  rows: Map<Element, string>,
  messagesById: Map<string, Message>,
  isUnread: (message: Message) => boolean,
) => {
  const ids: EntityId[] = [];
  for (const element of elements) {
    const id = rows.get(element);
    const message = id === undefined ? undefined : messagesById.get(id);
    if (message && isUnread(message)) ids.push(message.id);
  }
  return ids;
};
