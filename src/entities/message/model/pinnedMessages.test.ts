import { describe, expect, it } from 'vitest';
import { appendPinPage, clearPinsUpTo, findPin, isPinnableMessage, removePin, updatePinnedMessage, upsertPin } from './pinnedMessages';
import type { Message, PinnedMessage, PinnedMessages } from './types';

const message = (id: string, content = `text ${id}`): Message => ({
  id, sender: 'Anna', content, timestamp: '2026-11-20T10:00:00Z', type: 'message', read_by: [],
});
const pin = (id: string, minute: number, scope: PinnedMessage['scope'] = 'everyone'): PinnedMessage => ({
  message: message(id), scope, pinned_by: '7', pinned_at: `2026-11-21T10:${String(minute).padStart(2, '0')}:00Z`, can_unpin_for_everyone: true,
});
const state = (items: PinnedMessage[], count: number | null = items.length, cursor: string | null = null): PinnedMessages => ({
  items, next_cursor: cursor, count,
});

describe('pinned message state', () => {
  it('puts a new pin first and counts it once', () => {
    const next = upsertPin(state([pin('10', 1), pin('11', 0)]), pin('12', 5));
    expect(next.items.map((item) => item.message.id)).toEqual(['12', '10', '11']);
    expect(next.count).toBe(3);
    const again = upsertPin(next, pin('12', 6, 'me'));
    expect(again.items.map((item) => item.message.id)).toEqual(['12', '10', '11']);
    expect(again.count).toBe(3);
    expect(findPin(again, '12')?.scope).toBe('me');
  });

  it('removes a pin and keeps an unknown count unknown', () => {
    expect(removePin(state([pin('10', 1), pin('11', 0)]), '10').count).toBe(1);
    expect(removePin(state([pin('10', 1)], null, 'c'), '10').count).toBeNull();
    const unchanged = state([pin('10', 1)]);
    expect(removePin(unchanged, '99')).toBe(unchanged);
  });

  it('shows the current text after an edit', () => {
    const next = updatePinnedMessage(state([pin('10', 1)]), { ...message('10', 'new text'), edited_at: '2026-11-21T11:00:00Z' });
    expect(next.items[0].message.content).toBe('new text');
  });

  it('drops pins of cleared messages', () => {
    const next = clearPinsUpTo(state([pin('30', 3), pin('20', 2), pin('10', 1)]), '20');
    expect(next.items.map((item) => item.message.id)).toEqual(['30']);
    expect(next.count).toBe(1);
  });

  it('appends a page without duplicates and learns the count on the last page', () => {
    const next = appendPinPage(state([pin('30', 3), pin('20', 2)], null, 'c1'), { items: [pin('20', 2), pin('10', 1)], next_cursor: null });
    expect(next.items.map((item) => item.message.id)).toEqual(['30', '20', '10']);
    expect(next).toMatchObject({ next_cursor: null, count: 3 });
  });

  it('does not pin system lines, calls, failed sends or drafts', () => {
    expect(isPinnableMessage(message('10'))).toBe(true);
    expect(isPinnableMessage({ ...message('10'), is_system: true })).toBe(false);
    expect(isPinnableMessage({ ...message('10'), system_event: { kind: 'call', actor_name: 'Anna' } })).toBe(false);
    expect(isPinnableMessage({ ...message('10'), is_deleted: true })).toBe(false);
    expect(isPinnableMessage({ ...message('10'), delivery_error: 'failed' })).toBe(false);
    expect(isPinnableMessage(message('-5'))).toBe(false);
  });
});
