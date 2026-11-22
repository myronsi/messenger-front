import { describe, expect, it } from 'vitest';
import { historySnapshot } from './chatSnapshots';
import { DEEP_HISTORY_CHATS, historyLimitForRank, isHistoryKey, mergeHistoryPages, trimHistory } from './historySnapshotRules';

const page = (ids: number[], hasMore = true) => ({
  history: ids.map((id) => ({ id: String(id) })), has_more: hasMore, has_more_before: hasMore, next_before_id: ids.length ? String(ids[0]) : null,
});
const ids = (value: { history: { id: string | number }[] }) => value.history.map((message) => Number(message.id));
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

describe('history snapshot rules', () => {
  it('keeps 200 messages for the 20 most recent chats and 50 for the rest', () => {
    expect(historyLimitForRank(0)).toBe(200);
    expect(historyLimitForRank(DEEP_HISTORY_CHATS - 1)).toBe(200);
    expect(historyLimitForRank(DEEP_HISTORY_CHATS)).toBe(50);
  });

  it('tells history entries from chat list entries', () => {
    expect(isHistoryKey(historySnapshot('4'))).toBe(true);
    expect(isHistoryKey('direct-chats')).toBe(false);
  });

  it('keeps the newest messages when trimming and remembers that older ones exist', () => {
    const trimmed = trimHistory(page(range(1, 10), false), 4);
    expect(ids(trimmed)).toEqual([7, 8, 9, 10]);
    expect(trimmed).toMatchObject({ has_more: true, has_more_before: true, next_before_id: '7' });
  });

  it('adds the saved older messages in front of a fresh page that connects to them', () => {
    const merged = mergeHistoryPages(page(range(1, 6)), page(range(5, 9)));
    expect(ids(merged)).toEqual(range(1, 9));
    expect(merged.next_before_id).toBe('1');
  });

  it('drops the saved messages when there may be a gap between them and the fresh page', () => {
    expect(ids(mergeHistoryPages(page(range(1, 4)), page(range(8, 12))))).toEqual(range(8, 12));
  });

  it('takes the fresh page alone when it already reaches back as far or holds the whole chat', () => {
    expect(ids(mergeHistoryPages(page(range(3, 6)), page(range(1, 8))))).toEqual(range(1, 8));
    expect(ids(mergeHistoryPages(page(range(1, 6)), page(range(5, 9), false)))).toEqual(range(5, 9));
  });

  it('removes a message deleted since it was saved', () => {
    const merged = mergeHistoryPages(page(range(1, 8)), page([5, 7, 8]));
    expect(ids(merged)).toEqual([1, 2, 3, 4, 5, 7, 8]);
  });
});
