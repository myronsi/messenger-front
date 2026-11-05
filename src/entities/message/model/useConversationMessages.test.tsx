import { act, renderHook, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { conversationApi } from '../api/conversationApi';
import { useConversationMessages } from './useConversationMessages';
import type { Message } from './types';

const token = (sub: string) => `header.${btoa(JSON.stringify({ sub }))}.signature`;
const message = (id: string | number): Message => ({ id, type: 'message', sender: 'Alice', content: 'ok', timestamp: '', read_by: [] });
const setup = () => {
  const store = configureStore({ reducer: { [conversationApi.reducerPath]: conversationApi.reducer },
    middleware: defaults => defaults().concat(conversationApi.middleware) });
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  return { store, wrapper };
};

describe('one normalized conversation cache', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('access_token', token('1')); });

  it('shares sorted history and live updates across views, including before the initial query settles', async () => {
    const { wrapper } = setup();
    const first = renderHook(() => useConversationMessages('42'), { wrapper });
    act(() => first.result.current.setMessages([message('9007199254740993'), message(-1)]));
    const second = renderHook(() => useConversationMessages('42'), { wrapper });
    await waitFor(() => expect(second.result.current.messages).toHaveLength(2));
    act(() => second.result.current.setMessages(previous => [...previous, message('9007199254740992')]));
    await waitFor(() => expect(first.result.current.messages.map(item => item.id)).toEqual(['9007199254740992', '9007199254740993', -1]));
    expect(second.result.current.messages).toEqual(first.result.current.messages);
  });

  it('keeps messages when revisiting a conversation', async () => {
    const { wrapper } = setup();
    const first = renderHook(() => useConversationMessages('42'), { wrapper });
    act(() => first.result.current.setMessages([message('8')]));
    await waitFor(() => expect(first.result.current.messages).toHaveLength(1));
    first.unmount();
    const second = renderHook(() => useConversationMessages('42'), { wrapper });
    await waitFor(() => expect(second.result.current.messages.map(item => item.id)).toEqual(['8']));
  });

  it('isolates accounts and rejects a late response from a previous account', async () => {
    const { wrapper } = setup();
    const hook = renderHook(() => useConversationMessages('42'), { wrapper });
    const staleSetter = hook.result.current.setMessages;
    act(() => hook.result.current.setMessages([message('8')]));
    localStorage.setItem('access_token', token('2'));
    hook.rerender();
    await waitFor(() => expect(hook.result.current.messages).toEqual([]));
    act(() => staleSetter([message('9')]));
    expect(hook.result.current.messages).toEqual([]);
    act(() => hook.result.current.setMessages([message('10')]));
    await waitFor(() => expect(hook.result.current.messages.map(item => item.id)).toEqual(['10']));
  });
});
