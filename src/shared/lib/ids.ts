import type { components } from '@/shared/api/generated/schema';

// Ids of users, chats and messages are strings in the v2 contract: message ids are Snowflakes, larger than
// JavaScript numbers hold exactly. Never turn them into numbers; compare them with compareIds.
export type Id = components['schemas']['Id'];

// compareIds orders decimal ids numerically without converting them: a shorter id is smaller, ids of the
// same length compare like strings. Negative or non-decimal ids (local placeholders) sort first, by string.
export const compareIds = (a: Id, b: Id): number => {
  const aDecimal = /^\d+$/.test(a);
  const bDecimal = /^\d+$/.test(b);
  if (aDecimal !== bDecimal) return aDecimal ? 1 : -1;
  if (aDecimal) {
    const aTrimmed = a.replace(/^0+(?=\d)/, '');
    const bTrimmed = b.replace(/^0+(?=\d)/, '');
    if (aTrimmed.length !== bTrimmed.length) return aTrimmed.length - bTrimmed.length;
    return aTrimmed < bTrimmed ? -1 : aTrimmed > bTrimmed ? 1 : 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
};

export const isNewerId = (a: Id, b: Id) => compareIds(a, b) > 0;

// Messages that are not sent yet carry a local id until the server's id replaces it; a server id is
// always decimal, a local one never is.
export const isServerId = (id: Id | null | undefined): id is Id => typeof id === 'string' && /^\d+$/.test(id);
export const isLocalId = (id: Id | null | undefined): id is Id => typeof id === 'string' && !/^\d+$/.test(id);

const randomPart = () => (
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
);

// newLocalId makes the id of a message that is not sent yet; it also serves as its client_temp_id.
export const newLocalId = (): Id => `local-${randomPart()}`;

// maxId is the newest of the ids, or null for none.
export const maxId = (ids: Iterable<Id | null | undefined>): Id | null => {
  let newest: Id | null = null;
  for (const id of ids) {
    if (id != null && (newest === null || compareIds(id, newest) > 0)) newest = id;
  }
  return newest;
};

// sameId compares ids that may still arrive as numbers from older code paths.
export const sameId = (a: Id | number | null | undefined, b: Id | number | null | undefined) =>
  a != null && b != null && String(a) === String(b);
