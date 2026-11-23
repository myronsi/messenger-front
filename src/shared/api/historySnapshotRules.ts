import { compareIds, type EntityId } from './entityId';

export const DEEP_HISTORY_MESSAGES = 200;

export interface HistoryPageLike {
  history: { id: EntityId }[];
  has_more: boolean;
  has_more_before?: boolean;
  next_before_id: EntityId | null;
}

export const isHistoryKey = (key: string) => {
  try {
    return (JSON.parse(key) as unknown[])[0] === 'history';
  } catch {
    return false;
  }
};

export const trimHistory = <T extends HistoryPageLike>(page: T, limit: number): T => {
  if (page.history.length <= limit) return page;
  const history = page.history.slice(-limit);
  return { ...page, history, has_more: true, has_more_before: true, next_before_id: history[0].id };
};

const hasMoreBefore = (page: HistoryPageLike) => page.has_more_before ?? page.has_more;

export const mergeHistoryPages = <T extends HistoryPageLike>(saved: T | undefined, next: T, limit = DEEP_HISTORY_MESSAGES): T => {
  if (!saved?.history.length || !next.history.length || !hasMoreBefore(next)) return trimHistory(next, limit);
  const nextOldest = next.history[0].id;
  const savedOldest = saved.history[0].id;
  const savedNewest = saved.history[saved.history.length - 1].id;
  if (compareIds(nextOldest, savedNewest) > 0 || compareIds(nextOldest, savedOldest) <= 0) return trimHistory(next, limit);
  const older = saved.history.filter((message) => compareIds(message.id, nextOldest) < 0);
  return trimHistory({
    ...next,
    history: [...older, ...next.history],
    has_more: saved.has_more,
    has_more_before: hasMoreBefore(saved),
    next_before_id: saved.next_before_id ?? older[0]?.id ?? null,
  }, limit);
};
