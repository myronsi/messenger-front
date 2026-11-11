import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message, MessageHistoryResponse } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { MAX_LOADED_MESSAGES, useMessageHistory } from './useMessageHistory';

const mocks = vi.hoisted(() => ({
  latest: { currentData: undefined as unknown, isLoading: false, error: undefined as unknown },
  fetchHistory: vi.fn(),
}));

vi.mock('@/entities/message', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/message')>()),
  useGetMessageHistoryQuery: () => mocks.latest,
  useLazyGetMessageHistoryQuery: () => [mocks.fetchHistory],
}));
vi.mock('@/entities/chat', () => ({ useMarkChatReadMutation: () => [vi.fn()] }));

const message = (id: number): Message => ({ id: String(id), sender: 'a', content: `m${id}`, timestamp: '', type: 'message', read_by: [] });
const page = (ids: number[], extra: Partial<MessageHistoryResponse> = {}): MessageHistoryResponse => ({
  history: ids.map(message), has_more: true, has_more_before: true, has_more_after: false, next_before_id: ids.length ? String(ids[0]) : null, ...extra,
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

const setup = (initial: Message[]) => {
  const onBack = vi.fn();
  const setModal = vi.fn();
  const hook = renderHook(() => {
    const [messages, setMessages] = useState(initial);
    const history = useMessageHistory({
      chatId: '4', token: 't', username: 'a', messages, setMessages, currentUserIdRef: { current: '1' },
      onBackRef: { current: onBack }, translationsRef: { current: en }, setModal,
    });
    return { messages, history };
  });
  return { hook, onBack, setModal };
};

beforeEach(() => {
  mocks.latest = { currentData: page(range(951, 1000)), isLoading: false, error: undefined };
  mocks.fetchHistory.mockReset();
});
afterEach(() => { vi.useRealTimers(); });

describe('useMessageHistory paging', () => {
  it('replaces the window with the page around a message far back and pages from there', async () => {
    const { hook } = setup(range(951, 1000).map(message));
    await waitFor(() => expect(hook.result.current.history.hasMoreMessages).toBe(true));
    mocks.fetchHistory.mockReturnValue({ unwrap: () => Promise.resolve(page(range(100, 149), { has_more_after: true, next_after_id: '149' })) });
    await act(async () => { await hook.result.current.history.loadMessagesAround('125'); });
    expect(mocks.fetchHistory).toHaveBeenCalledWith({ chatId: '4', limit: 50, aroundId: '125' });
    expect(hook.result.current.messages.map((item) => item.id)).toEqual(range(100, 149).map(String));
    expect(hook.result.current.history.hasMoreNewerMessages).toBe(true);
    mocks.fetchHistory.mockReturnValue({ unwrap: () => Promise.resolve(page(range(150, 199), { has_more_after: true, next_after_id: '199' })) });
    await act(async () => { await hook.result.current.history.loadNewerMessages(); });
    expect(mocks.fetchHistory).toHaveBeenLastCalledWith({ chatId: '4', limit: 50, afterId: '149' });
  });

  it('extends the window when the page around a message overlaps it', async () => {
    const { hook } = setup(range(951, 1000).map(message));
    await waitFor(() => expect(hook.result.current.history.hasMoreMessages).toBe(true));
    mocks.fetchHistory.mockReturnValue({ unwrap: () => Promise.resolve(page(range(920, 969), { has_more_after: true })) });
    await act(async () => { await hook.result.current.history.loadMessagesAround('940'); });
    expect(hook.result.current.messages[0].id).toBe('920');
    expect(hook.result.current.messages[hook.result.current.messages.length - 1].id).toBe('1000');
    expect(hook.result.current.history.hasMoreNewerMessages).toBe(false);
  });

  it('trims the newest messages beyond the loaded limit after paging back and lets them load again', async () => {
    const { hook } = setup(range(501, 1000).map(message));
    await waitFor(() => expect(hook.result.current.history.hasMoreMessages).toBe(true));
    mocks.fetchHistory.mockReturnValue({ unwrap: () => Promise.resolve(page(range(451, 500))) });
    await act(async () => { await hook.result.current.history.loadOlderMessages(); });
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(MAX_LOADED_MESSAGES));
    expect(hook.result.current.messages[0].id).toBe('451');
    expect(hook.result.current.messages[hook.result.current.messages.length - 1].id).toBe('950');
    expect(hook.result.current.history.hasMoreNewerMessages).toBe(true);
  });

  it('goes back when paging is forbidden', async () => {
    const { hook, onBack, setModal } = setup(range(951, 1000).map(message));
    await waitFor(() => expect(hook.result.current.history.hasMoreMessages).toBe(true));
    mocks.fetchHistory.mockReturnValue({ unwrap: () => Promise.reject({ status: 403, data: {} }) });
    await act(async () => { await hook.result.current.history.loadOlderMessages(); });
    expect(onBack).toHaveBeenCalledOnce();
    expect(setModal).not.toHaveBeenCalled();
  });

  it('asks to sign in again and then goes back when paging is unauthorized', async () => {
    const { hook, onBack, setModal } = setup(range(951, 1000).map(message));
    await waitFor(() => expect(hook.result.current.history.hasMoreMessages).toBe(true));
    vi.useFakeTimers();
    mocks.fetchHistory.mockReturnValue({ unwrap: () => Promise.reject({ status: 401, data: {} }) });
    await act(async () => { await hook.result.current.history.loadOlderMessages(); });
    expect(setModal).toHaveBeenCalledWith({ type: 'error', message: en.loginRequired });
    expect(onBack).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('drops a message deleted on the server when the newest page arrives', async () => {
    mocks.latest = { currentData: page([951, 953], { has_more_before: false }), isLoading: false, error: undefined };
    const { hook } = setup([951, 952, 953].map(message));
    await waitFor(() => expect(hook.result.current.messages.map(item => item.id)).toEqual(['951', '953']));
  });
});
