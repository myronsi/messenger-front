import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { useMessageReadReceipts } from './useMessageReadReceipts';

type Entry = { target: Element; isIntersecting: boolean };
let observers: { report: (entries: Entry[]) => void; observed: Element[] }[] = [];

const message = (id: string, extra: Partial<Message> = {}): Message => ({
  id, sender: 'bob', sender_id: '2', content: id, timestamp: '2026-11-10T10:00:00Z', type: 'message', read_by: [], ...extra,
});

const setup = (initial: Message[]) => {
  const refs: { [key: string]: HTMLDivElement | null } = {};
  initial.forEach((item) => { refs[item.id] = document.createElement('div'); });
  const onMarkMessagesRead = vi.fn(async () => undefined);
  const messageRefs = { current: refs };
  const chatContainerRef = { current: document.createElement('div') };
  const hook = renderHook(({ messages, canMark }) => useMessageReadReceipts({
    messages, userId: '1', messageRefs, chatContainerRef,
    isOwnMessage: (item) => item.sender_id === '1', onMarkMessagesRead: canMark ? onMarkMessagesRead : undefined, enabled: true,
  }), { initialProps: { messages: initial, canMark: true } });
  return { hook, refs, onMarkMessagesRead };
};

describe('useMessageReadReceipts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    observers = [];
    vi.stubGlobal('IntersectionObserver', class {
      observed: Element[] = [];
      report: (entries: Entry[]) => void;
      constructor(callback: (entries: Entry[]) => void) { this.report = callback; observers.push(this); }
      observe(element: Element) { this.observed.push(element); }
      unobserve(element: Element) { this.observed = this.observed.filter((item) => item !== element); }
      disconnect() { this.observed = []; }
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('keeps one observer while messages change and observes only the added rows', () => {
    const first = [message('10'), message('11')];
    const { hook, refs } = setup(first);
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toHaveLength(2);

    refs['12'] = document.createElement('div');
    hook.rerender({ messages: [...first, message('12')], canMark: true });
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([refs['10'], refs['11'], refs['12']]);
  });

  it('marks a visible unread message as read once and skips own or already read ones', async () => {
    const messages = [message('10'), message('11', { sender_id: '1' }), message('12', { read_by: [{ user_id: '1', read_at: '' }] })];
    const { refs, onMarkMessagesRead } = setup(messages);
    act(() => observers[0].report(['10', '11', '12'].map((id) => ({ target: refs[id]!, isIntersecting: true }))));
    act(() => observers[0].report([{ target: refs['10']!, isIntersecting: true }]));
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(onMarkMessagesRead).toHaveBeenCalledOnce();
    expect(onMarkMessagesRead).toHaveBeenCalledWith(['10']);
  });

  it('marks messages that are already on screen once marking becomes possible', async () => {
    const messages = [message('10')];
    const { hook, refs, onMarkMessagesRead } = setup(messages);
    hook.rerender({ messages, canMark: false });
    act(() => observers[0].report([{ target: refs['10']!, isIntersecting: true }]));
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(onMarkMessagesRead).not.toHaveBeenCalled();

    hook.rerender({ messages, canMark: true });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(onMarkMessagesRead).toHaveBeenCalledWith(['10']);
  });
});
