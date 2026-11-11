import { compareIds, isPersistedId } from '@/shared/api/entityId';
import type { Message } from './types';
import { sortMessages, trimNewestMessages } from './historyNormalizers';

export const MESSAGE_PAGE_SIZE = 50;
export const MAX_LOADED_MESSAGES = 500;

const persistedRange = (messages: Message[]) => {
  const persisted = messages.filter((message) => isPersistedId(message.id));
  return persisted.length ? { first: persisted[0].id, last: persisted[persisted.length - 1].id } : null;
};

export const pageTouchesWindow = (currentMessages: Message[], page: Message[]) => {
  const current = persistedRange(currentMessages);
  const fresh = persistedRange(sortMessages(page));
  if (!current || !fresh) return false;
  return compareIds(fresh.first, current.last) <= 0 && compareIds(fresh.last, current.first) >= 0;
};

export interface AroundPageResult {
  messages: Message[];
  joined: boolean;
  extendsOlder: boolean;
  extendsNewer: boolean;
  trimmedNewestId: Message['id'] | null;
}

export const joinAroundPage = (currentMessages: Message[], page: Message[], limit: number): AroundPageResult => {
  const fresh = sortMessages(page.filter((message) => isPersistedId(message.id)));
  const unsent = currentMessages.filter((message) => !isPersistedId(message.id));
  if (!pageTouchesWindow(currentMessages, fresh)) {
    return { messages: [...fresh, ...unsent], joined: false, extendsOlder: true, extendsNewer: true, trimmedNewestId: null };
  }
  const current = persistedRange(currentMessages)!;
  const byId = new Map(currentMessages.map((message) => [String(message.id), message]));
  fresh.forEach((message) => { if (!byId.has(String(message.id))) byId.set(String(message.id), message); });
  const merged = sortMessages([...byId.values()]);
  const extendsOlder = compareIds(fresh[0].id, current.first) < 0;
  const extendsNewer = compareIds(fresh[fresh.length - 1].id, current.last) > 0;
  const trimmed = extendsOlder && !extendsNewer ? trimNewestMessages(merged, limit) : null;
  return {
    messages: trimmed?.messages ?? merged,
    joined: true,
    extendsOlder,
    extendsNewer,
    trimmedNewestId: trimmed?.newestId ?? null,
  };
};
