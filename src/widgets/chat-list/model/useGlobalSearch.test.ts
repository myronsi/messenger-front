import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageSearchHit } from '@/entities/message';
import type { User } from '@/entities/user';
import { useGlobalSearch } from './useGlobalSearch';

const user = (id: string): User => ({ id, username: `user${id}`, display_name: `User ${id}` });
const hit = (id: string): MessageSearchHit => ({
  id, chatId: '1', senderName: 'Carol', senderUsername: 'carol', timestamp: 't', kind: 'text', text: `text ${id}`, highlight: null,
});

const searchUsers = vi.fn();
const searchMessages = vi.fn();
const fetchNextPage = vi.fn();

vi.mock('@/entities/user', () => ({ useSearchUsersQuery: (...args: unknown[]) => searchUsers(...args) }));
vi.mock('@/entities/message', () => ({ useSearchMessagesInfiniteQuery: (...args: unknown[]) => searchMessages(...args) }));

const key = (name: string) => ({ key: name, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

const setup = () => {
  const onOpenUser = vi.fn();
  const onOpenMessage = vi.fn();
  const onClose = vi.fn();
  const view = renderHook(() => useGlobalSearch({ onOpenUser, onOpenMessage, onClose }));
  const typeQuery = (text: string) => {
    act(() => view.result.current.setInput(text));
    act(() => { vi.advanceTimersByTime(300); });
  };
  return { ...view, onOpenUser, onOpenMessage, onClose, typeQuery };
};

describe('useGlobalSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchUsers.mockImplementation((_q: string, { skip }: { skip: boolean }) => ({
      data: skip ? undefined : { users: [user('1'), user('2')] }, isFetching: false, isError: false,
    }));
    searchMessages.mockImplementation((_args: unknown, { skip }: { skip: boolean }) => ({
      data: skip ? undefined : { pages: [{ hits: [hit('10'), hit('11')], nextCursor: 'c' }] },
      hasNextPage: !skip, isFetching: false, isFetchingNextPage: false, isError: false, fetchNextPage,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('searches after the debounce and only from two characters', () => {
    const { result, typeQuery } = setup();
    typeQuery('a');
    expect(result.current.isTooShort).toBe(true);
    expect(result.current.items).toHaveLength(0);
    expect(searchMessages).toHaveBeenLastCalledWith({ q: 'a' }, { skip: true });

    typeQuery(' ne ');
    expect(searchMessages).toHaveBeenLastCalledWith({ q: 'ne' }, { skip: false });
    expect(result.current.items.map((item) => item.key)).toEqual(['user-1', 'user-2', 'message-10', 'message-11']);
  });

  it('moves through people and messages as one list and opens the active item', () => {
    const { result, typeQuery, onOpenUser, onOpenMessage } = setup();
    typeQuery('needle');

    act(() => result.current.onKeyDown(key('ArrowDown')));
    act(() => result.current.onKeyDown(key('Enter')));
    expect(onOpenUser).toHaveBeenCalledWith(user('1'));

    act(() => { for (let i = 0; i < 5; i += 1) result.current.onKeyDown(key('ArrowDown')); });
    expect(result.current.activeIndex).toBe(3);
    act(() => result.current.onKeyDown(key('ArrowUp')));
    act(() => result.current.onKeyDown(key('Enter')));
    expect(onOpenMessage).toHaveBeenCalledWith(hit('10'));
  });

  it('closes on Escape and loads the next page of messages', () => {
    const { result, typeQuery, onClose } = setup();
    typeQuery('needle');
    act(() => result.current.onKeyDown(key('Escape')));
    expect(onClose).toHaveBeenCalled();

    act(() => result.current.loadMore());
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
