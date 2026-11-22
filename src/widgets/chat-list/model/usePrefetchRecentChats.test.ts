import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatsToPrefetch, PREFETCH_CHATS, PREFETCH_START_DELAY_MS, resetPrefetchedChats, usePrefetchRecentChats } from './usePrefetchRecentChats';

const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), initiate: vi.fn(), token: 't' as string | null }));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@/shared/auth/session', () => ({ getAccessToken: () => mocks.token, subscribeToAccessToken: () => () => undefined }));
vi.mock('@/entities/message', () => ({
  MESSAGE_PAGE_SIZE: 50,
  messageApi: { endpoints: { getMessageHistory: { initiate: mocks.initiate } } },
}));

const chats = Array.from({ length: 20 }, (_, index) => ({ id: String(index + 1), first_unread_message_id: index === 0 ? '99' : null }));

describe('usePrefetchRecentChats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPrefetchedChats();
    mocks.token = 't';
    mocks.initiate.mockReset().mockImplementation((args) => args);
    mocks.dispatch.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it('picks the first chats of the list and skips requests and unsaved chats', () => {
    expect(chatsToPrefetch([{ id: '-1' }, { id: '2', is_request: true }, { id: '3' }]).map((chat) => chat.id)).toEqual(['3']);
    expect(chatsToPrefetch(chats)).toHaveLength(PREFETCH_CHATS);
  });

  it('loads the newest page of the top chats in the background after a short delay', async () => {
    renderHook(() => usePrefetchRecentChats(chats));
    expect(mocks.dispatch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(PREFETCH_START_DELAY_MS);
    expect(mocks.initiate).toHaveBeenCalledTimes(PREFETCH_CHATS);
    expect(mocks.initiate).toHaveBeenCalledWith({ chatId: '1', limit: 50, aroundId: '99' }, { subscribe: false });
    expect(mocks.initiate).toHaveBeenCalledWith({ chatId: '2', limit: 50, aroundId: undefined }, { subscribe: false });
  });

  it('does not load the same chats again on the next mount', async () => {
    const first = renderHook(() => usePrefetchRecentChats(chats));
    await vi.advanceTimersByTimeAsync(PREFETCH_START_DELAY_MS);
    first.unmount();
    mocks.initiate.mockClear();
    renderHook(() => usePrefetchRecentChats(chats));
    await vi.advanceTimersByTimeAsync(PREFETCH_START_DELAY_MS);
    expect(mocks.initiate.mock.calls.map(([args]) => args.chatId)).toEqual(['16', '17', '18', '19', '20']);
  });
});
