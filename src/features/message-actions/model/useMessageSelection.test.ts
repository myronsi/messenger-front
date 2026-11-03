import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { MAX_SELECTED_MESSAGES, SELECTION_CLOSE_MS, forwardTargetLimit, useMessageSelection } from './useMessageSelection';

const message = (id: string, extra: Partial<Message> = {}): Message => ({
  id, sender: 'ann', content: 'hi', timestamp: '2026-11-03T10:00:00Z', type: 'message', read_by: [], ...extra,
});
const click = (keys: Partial<MouseEvent> = {}, type = 'click') =>
  ({ type, ctrlKey: false, metaKey: false, shiftKey: false, preventDefault: vi.fn(), ...keys }) as unknown as MouseEvent;
const chat = ['1', '2', '3', '4', '5'].map((id) => message(id));
const selected = (ids: ReadonlySet<unknown>) => [...ids].sort();

afterEach(() => vi.unstubAllGlobals());

describe('useMessageSelection', () => {
  it('starts with one message, toggles others and ends when nothing is left', () => {
    const { result } = renderHook(() => useMessageSelection('5', chat));
    expect(result.current.selection.active).toBe(false);

    act(() => result.current.start(chat[0]));
    act(() => result.current.selection.toggle(chat[1]));
    expect(selected(result.current.selection.ids)).toEqual(['1', '2']);

    act(() => result.current.selection.toggle(chat[0]));
    act(() => result.current.selection.toggle(chat[1]));
    expect(result.current.selection.active).toBe(false);
  });

  it('skips messages that are not sent yet or deleted', () => {
    const { result } = renderHook(() => useMessageSelection('5', chat));
    act(() => result.current.start(message('temp-1')));
    expect(result.current.selection.active).toBe(false);

    act(() => result.current.start(chat[0]));
    act(() => result.current.selection.toggle(message('9', { is_deleted: true })));
    expect(selected(result.current.selection.ids)).toEqual(['1']);
  });

  it('stops at the delete limit', () => {
    const many = Array.from({ length: MAX_SELECTED_MESSAGES + 5 }, (_, i) => message(String(i + 1)));
    const { result } = renderHook(() => useMessageSelection('5', many));
    act(() => result.current.start(many[0]));
    act(() => result.current.selection.toggle(many[many.length - 1], true));
    expect(result.current.selection.ids.size).toBe(MAX_SELECTED_MESSAGES);
  });

  it('selects the range from the last picked message with shift', () => {
    const { result } = renderHook(() => useMessageSelection('5', [...chat.slice(0, 2), message('3', { is_deleted: true }), ...chat.slice(3)]));
    act(() => result.current.start(chat[1]));
    act(() => result.current.selection.toggle(chat[4], true));
    expect(selected(result.current.selection.ids)).toEqual(['2', '4', '5']);
  });

  it('starts and extends the selection with modifier clicks and passes plain clicks on', () => {
    const handler = vi.fn();
    const { result } = renderHook(() => useMessageSelection('5', chat));

    act(() => result.current.intercept(handler)(click(), chat[0]));
    expect(handler).toHaveBeenCalledTimes(1);

    act(() => result.current.intercept(handler)(click({ ctrlKey: true }), chat[0]));
    act(() => result.current.intercept(handler)(click({ metaKey: true }), chat[1]));
    act(() => result.current.intercept(handler)(click({ shiftKey: true }), chat[3]));
    expect(selected(result.current.selection.ids)).toEqual(['1', '2', '3', '4']);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('leaves the long-press menu event to the long-press on touch screens', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }));
    const handler = vi.fn();
    const { result } = renderHook(() => useMessageSelection('5', chat));
    const event = click({}, 'contextmenu');
    act(() => result.current.intercept(handler)(event, chat[0]));
    expect(handler).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('plays the closing phase before it lets go of the selection', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMessageSelection('5', chat));
    act(() => result.current.start(chat[0]));
    act(() => result.current.clear());
    expect(result.current.selection).toMatchObject({ active: false, closing: true });
    expect(selected(result.current.selection.ids)).toEqual(['1']);
    act(() => { vi.advanceTimersByTime(SELECTION_CLOSE_MS); });
    expect(result.current.selection).toMatchObject({ active: false, closing: false });
    expect(result.current.selection.ids.size).toBe(0);
    vi.useRealTimers();
  });

  it('forgets the selection when the chat changes', () => {
    const { result, rerender } = renderHook(({ chatId }) => useMessageSelection(chatId, chat), { initialProps: { chatId: '5' } });
    act(() => result.current.start(chat[0]));
    rerender({ chatId: '6' });
    expect(result.current.selection.active).toBe(false);
  });
});

describe('selection against the loaded messages', () => {
  it('drops ids that are deleted or no longer loaded and closes when none remain', () => {
    const { result, rerender } = renderHook(({ messages }) => useMessageSelection('5', messages), { initialProps: { messages: chat } });
    act(() => result.current.start(chat[0]));
    act(() => result.current.selection.toggle(chat[1]));
    rerender({ messages: [message('1', { is_deleted: true }), ...chat.slice(1)] });
    expect(selected(result.current.selection.ids)).toEqual(['2']);
    rerender({ messages: chat.slice(2) });
    expect(result.current.selection.active).toBe(false);
  });

  it('keeps one forward within the backend limit of 20 copies', () => {
    expect(forwardTargetLimit(1)).toBe(20);
    expect(forwardTargetLimit(3)).toBe(6);
    expect(forwardTargetLimit(20)).toBe(1);
  });
});
