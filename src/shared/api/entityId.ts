// Server IDs stay strings; numeric IDs are reserved for local drafts and optimistic sends.
export type EntityId = string | number;
export const compareIds = (left: EntityId, right: EntityId) => {
  const a = BigInt(left);
  const b = BigInt(right);
  return a < b ? -1 : a > b ? 1 : 0;
};
export const isPersistedId = (id: EntityId) => /^\d+$/.test(String(id)) && BigInt(id) > 0n;
