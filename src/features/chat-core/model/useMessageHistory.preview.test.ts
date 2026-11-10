import { renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Message, MessageHistoryResponse } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { useMessageHistory } from './useMessageHistory';

const message = (id: number): Message => ({ id: String(id), sender: 'a', content: `m${id}`, timestamp: '', type: 'message', read_by: [] });
const page = (ids: number[]): MessageHistoryResponse => ({
  history: ids.map(message), has_more: true, has_more_before: true, has_more_after: false, next_before_id: ids.length ? String(ids[0]) : null,
});

const mocks = vi.hoisted(() => ({ latest: { currentData: undefined as unknown, isLoading: true, error: undefined as unknown }, saved: null as unknown }));

vi.mock('@/entities/message', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/message')>()),
  useGetMessageHistoryQuery: () => mocks.latest,
  useLazyGetMessageHistoryQuery: () => [vi.fn()],
}));
vi.mock('@/entities/chat', () => ({ useMarkChatReadMutation: () => [vi.fn()] }));
vi.mock('@/shared/api/chatSnapshots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/chatSnapshots')>()),
  useChatSnapshot: (key: string | null) => (key ? mocks.saved : undefined),
}));

const render = () => {
  const shown: number[] = [];
  const hook = renderHook(() => {
    const [messages, setMessages] = useState<Message[]>([]);
    const history = useMessageHistory({
      chatId: '4', token: 't', username: 'a', messages, setMessages, currentUserIdRef: { current: '1' },
      onBackRef: { current: vi.fn() }, translationsRef: { current: en }, setModal: vi.fn(),
    });
    shown.push((history.preview ?? messages).length);
    return { messages, history };
  });
  return { hook, shown };
};

describe('useMessageHistory saved page', () => {
  it('never shows an empty list while the fresh page replaces the saved one', async () => {
    mocks.saved = page([1, 2, 3]);
    mocks.latest = { currentData: undefined, isLoading: true, error: undefined };
    const { hook, shown } = render();
    expect(shown[shown.length - 1]).toBe(3);
    mocks.latest = { currentData: page([1, 2, 3, 4]), isLoading: false, error: undefined };
    hook.rerender();
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(4));
    expect(shown.slice(shown.indexOf(3))).not.toContain(0);
    expect(hook.result.current.history.preview).toBeUndefined();
  });

  it('drops the saved page when the chat turns out to be empty', async () => {
    mocks.saved = page([1, 2, 3]);
    mocks.latest = { currentData: page([]), isLoading: false, error: undefined };
    const { hook } = render();
    await waitFor(() => expect(hook.result.current.history.preview).toBeUndefined());
    expect(hook.result.current.messages).toHaveLength(0);
  });
});
