import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message, MessageHistoryResponse } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { useMessageHistory } from './useMessageHistory';

const mocks = vi.hoisted(() => ({
  latest: { currentData: undefined as unknown, isLoading: false, isFetching: false, error: undefined as unknown },
  fetchHistory: vi.fn(),
}));

vi.mock('@/entities/message', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/message')>()),
  useGetMessageHistoryQuery: () => mocks.latest,
  useLazyGetMessageHistoryQuery: () => [mocks.fetchHistory],
}));
vi.mock('@/entities/chat', () => ({ useMarkChatReadMutation: () => [vi.fn()] }));

const message = (id: number): Message => ({ id: String(id), sender: 'a', content: `m${id}`, timestamp: '', type: 'message', read_by: [] });
const page = (ids: number[]): MessageHistoryResponse => ({
  history: ids.map(message), has_more: false, has_more_before: false, has_more_after: false, next_before_id: null,
});

const setup = (initial: Message[]) => renderHook(() => {
  const [messages, setMessages] = useState(initial);
  const history = useMessageHistory({
    chatId: '4', token: 't', username: 'a', messages, setMessages, currentUserIdRef: { current: '1' },
    onBackRef: { current: vi.fn() }, translationsRef: { current: en }, setModal: vi.fn(),
  });
  return { messages, history };
});

describe('catching up when the socket first opens', () => {
  beforeEach(() => {
    mocks.fetchHistory.mockReset();
    mocks.fetchHistory.mockReturnValue({ unwrap: () => Promise.resolve(page([11])) });
  });

  it('sends no request while the history request is still in flight', async () => {
    mocks.latest = { currentData: undefined, isLoading: true, isFetching: true, error: undefined };
    const hook = setup([message(10)]);
    await act(async () => { await hook.result.current.history.catchUpAfterReconnect(true); });
    expect(mocks.fetchHistory).not.toHaveBeenCalled();
  });

  it('sends no request when nothing has been loaded yet', async () => {
    mocks.latest = { currentData: undefined, isLoading: false, isFetching: false, error: undefined };
    const hook = setup([]);
    await act(async () => { await hook.result.current.history.catchUpAfterReconnect(true); });
    expect(mocks.fetchHistory).not.toHaveBeenCalled();
  });

  it('loads only the messages after the newest loaded one when history was already loaded', async () => {
    mocks.latest = { currentData: page([9, 10]), isLoading: false, isFetching: false, error: undefined };
    const hook = setup([message(9), message(10)]);
    await act(async () => { await hook.result.current.history.catchUpAfterReconnect(true); });
    expect(mocks.fetchHistory).toHaveBeenCalledOnce();
    expect(mocks.fetchHistory).toHaveBeenCalledWith(expect.objectContaining({ chatId: '4', afterId: '10' }));
    expect(hook.result.current.messages.map(item => item.id)).toEqual(['9', '10', '11']);
  });

  it('still reloads the latest page after a real reconnect with nothing loaded', async () => {
    mocks.latest = { currentData: undefined, isLoading: false, isFetching: false, error: undefined };
    const hook = setup([]);
    await act(async () => { await hook.result.current.history.catchUpAfterReconnect(); });
    expect(mocks.fetchHistory).toHaveBeenCalledOnce();
    expect(mocks.fetchHistory.mock.calls[0][0]).not.toHaveProperty('afterId');
  });
});
