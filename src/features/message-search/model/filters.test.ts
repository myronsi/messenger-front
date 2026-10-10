import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, hasFilters, toSearchArgs } from './filters';

describe('toSearchArgs', () => {
  it('limits the search to the chat and leaves unset filters out', () => {
    expect(toSearchArgs('7', 'hello', EMPTY_FILTERS)).toEqual({
      q: 'hello', chat_id: '7', sender_id: undefined, type: undefined, from: undefined, to: undefined,
    });
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('maps sender, type and a local day range with the last day included', () => {
    const filters = { senderId: '4', type: 'voice' as const, fromDate: '2026-10-01', toDate: '2026-10-03' };
    const args = toSearchArgs('7', 'hi', filters);
    expect(args).toMatchObject({ sender_id: '4', type: 'voice' });
    expect(args.from).toBe(new Date(2026, 9, 1).toISOString());
    expect(args.to).toBe(new Date(2026, 9, 4).toISOString());
    expect(hasFilters(filters)).toBe(true);
  });

  it('ignores a malformed date', () => {
    expect(toSearchArgs('7', 'hi', { ...EMPTY_FILTERS, fromDate: 'nope' }).from).toBeUndefined();
  });
});
