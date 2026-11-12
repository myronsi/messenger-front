import { isPersistedId, type EntityId } from '@/shared/api/entityId';

const UNSENT_PREFIX = 'unsent:';
export const MAX_UNSENT_PER_CHAT = 100;

export const unsentMessagesId = (account: string | null, chatId: EntityId) => (
  account && isPersistedId(chatId) ? `${account}:${chatId}` : null
);

export const readUnsentMessages = <T>(id: string | null): T[] => {
  if (!id) return [];
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(`${UNSENT_PREFIX}${id}`) ?? '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
};

export const writeUnsentMessages = <T>(id: string | null, messages: T[]) => {
  if (!id) return;
  try {
    if (messages.length) sessionStorage.setItem(`${UNSENT_PREFIX}${id}`, JSON.stringify(messages.slice(-MAX_UNSENT_PER_CHAT)));
    else sessionStorage.removeItem(`${UNSENT_PREFIX}${id}`);
  } catch {
    return;
  }
};

export const countUnsentMessages = (account: string | null) => {
  if (!account) return 0;
  try {
    return Object.keys(sessionStorage)
      .filter((key) => key.startsWith(`${UNSENT_PREFIX}${account}:`))
      .reduce((total, key) => total + readUnsentMessages(key.slice(UNSENT_PREFIX.length)).length, 0);
  } catch {
    return 0;
  }
};

export const clearUnsentMessages = () => {
  try {
    Object.keys(sessionStorage).filter((key) => key.startsWith(UNSENT_PREFIX)).forEach((key) => sessionStorage.removeItem(key));
  } catch {
    return;
  }
};
