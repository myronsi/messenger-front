import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageSearchHit } from '@/entities/message';
import { useChatSearch } from './useChatSearch';

const hit = (id: string): MessageSearchHit => ({
  id, chatId: '7', senderName: 'Carol', senderUsername: 'carol', timestamp: 't', kind: 'text', text: id, highlight: null,
});

let pages: MessageSearchHit[][] = [];
let hasNextPage = false;
const fetchNextPage = vi.fn();
const searchMessages = vi.fn();

vi.mock('@/entities/message', () => ({ useSearchMessagesInfiniteQuery: (...args: unknown[]) => searchMessages(...args) }));

const key = (name: string, extra: Partial<KeyboardEvent> = {}) => ({ key: name, preventDefault: vi.fn(), ...extra }) as unknown as KeyboardEvent;

const setup = () => {
  const onJump = vi.fn();
  const onClose = vi.fn();
  const view = renderHook(() => useChatSearch({ chatId: '7', onJump, onClose }));
  act(() => view.result.current.setInput('needle'));
  act(() => { vi.advanceTimersByTime(300); });
  return { ...view, onJump, onClose };
};

describe('useChatSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pages = [[hit('30'), hit('20')]];
    hasNextPage = true;
    searchMessages.mockImplementation((_args: unknown, { skip }: { skip: boolean }) => ({
      data: skip ? undefined : { pages: pages.map((page) => ({ hits: page, nextCursor: null })) },
      hasNextPage, isFetching: false, isFetchingNextPage: false, isError: false, fetchNextPage,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('searches the chat and walks from the newest result to older ones', () => {
    const { result, onJump } = setup();
    expect(searchMessages).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'needle', chat_id: '7' }), { skip: false });
    expect(result.current.counter).toBe('2+');

    act(() => result.current.onKeyDown(key('Enter')));
    expect(onJump).toHaveBeenLastCalledWith('30');
    act(() => result.current.older());
    expect(onJump).toHaveBeenLastCalledWith('20');
    expect(result.current.counter).toBe('2 / 2+');

    act(() => result.current.onKeyDown(key('Enter', { shiftKey: true })));
    expect(onJump).toHaveBeenLastCalledWith('30');
    expect(result.current.canGoNewer).toBe(false);
  });

  it('loads the next page when going past the last loaded result, then shows it', () => {
    const { result, rerender, onJump } = setup();
    act(() => result.current.goTo(1));
    act(() => result.current.older());
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    pages = [[hit('30'), hit('20')], [hit('10')]];
    hasNextPage = false;
    rerender();
    expect(onJump).toHaveBeenLastCalledWith('10');
    expect(result.current.counter).toBe('3 / 3');
    expect(result.current.canGoOlder).toBe(false);
  });

  it('starts over when a filter changes and closes on Escape', () => {
    const { result, onClose } = setup();
    act(() => result.current.goTo(0));
    act(() => result.current.setFilters((filters) => ({ ...filters, type: 'voice' })));
    expect(result.current.index).toBe(-1);
    expect(searchMessages).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'voice' }), { skip: false });

    act(() => result.current.onKeyDown(key('Escape')));
    expect(onClose).toHaveBeenCalled();
  });
});
