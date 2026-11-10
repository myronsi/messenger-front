import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { isUnreadByMe, syncObservedRows, unreadVisibleMessageIds } from './rowObservation';

const row = () => document.createElement('div');
const message = (id: string, extra: Partial<Message> = {}): Message => ({
  id, sender: 'bob', sender_id: '2', content: id, timestamp: '2026-11-10T10:00:00Z', type: 'message', read_by: [], ...extra,
});

describe('syncObservedRows', () => {
  it('observes only rows that were added and forgets rows that are gone', () => {
    const [a, b, c] = [row(), row(), row()];
    const rows = new Map<Element, string>();
    const observe = vi.fn();
    const unobserve = vi.fn();
    syncObservedRows({ 1: a, 2: b }, rows, observe, unobserve);
    expect(observe.mock.calls.map(([element]) => element)).toEqual([a, b]);

    observe.mockClear();
    syncObservedRows({ 1: null, 2: b, 3: c }, rows, observe, unobserve);
    expect(observe.mock.calls.map(([element]) => element)).toEqual([c]);
    expect(unobserve.mock.calls.map(([element]) => element)).toEqual([a]);
    expect([...rows.entries()]).toEqual([[b, '2'], [c, '3']]);
  });

  it('follows a row whose id changed from the temporary to the server id', () => {
    const element = row();
    const rows = new Map<Element, string>();
    const observe = vi.fn();
    syncObservedRows({ '-1': element }, rows, observe, vi.fn());
    syncObservedRows({ '-1': null, 10: element }, rows, observe, vi.fn());
    expect(observe).toHaveBeenCalledOnce();
    expect(rows.get(element)).toBe('10');
  });
});

describe('unreadVisibleMessageIds', () => {
  it('looks visible rows up by id and returns only unread messages of others', () => {
    const [own, read, unread, unknown] = [row(), row(), row(), row()];
    const rows = new Map<Element, string>([[own, '1'], [read, '2'], [unread, '3'], [unknown, '4']]);
    const messagesById = new Map([
      ['1', message('1', { sender_id: '7' })],
      ['2', message('2', { read_by: [{ user_id: '7', read_at: '' }] })],
      ['3', message('3')],
    ]);
    const isOwn = (item: Message) => item.sender_id === '7';
    const result = unreadVisibleMessageIds([own, read, unread, unknown], rows, messagesById, (item) => isUnreadByMe(item, '7', isOwn));
    expect(result).toEqual(['3']);
  });
});
