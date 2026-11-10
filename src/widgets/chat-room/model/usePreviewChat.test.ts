import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { usePreviewChat } from './usePreviewChat';

const mocks = vi.hoisted(() => ({
  createChat: vi.fn(),
  undo: vi.fn(),
  dispatch: vi.fn(),
  updateQueryData: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/entities/chat', () => ({
  chatApi: { util: { updateQueryData: mocks.updateQueryData } },
  useCreateChatMutation: () => [mocks.createChat],
}));
vi.mock('@/entities/message', () => ({}));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@/shared/hooks/useDraftState', () => ({ useDraftState: () => useState('hello') }));
vi.mock('@/shared/api/client', () => ({ apiClient: { POST: mocks.post } }));
vi.mock('@/shared/api/uploadWithProgress', () => ({ uploadWithProgress: vi.fn() }));
vi.mock('@/features/chat-core', () => ({ appendMessageFiles: vi.fn(), createLocalFileContent: vi.fn() }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

const setup = (onChatCreated = vi.fn()) => {
  const hook = renderHook(() => usePreviewChat({
    chatId: -5, chatName: 'bob', chatDisplayName: 'Bob', username: 'alice', userId: '1',
    directDraftDisabled: false, directDraftReason: null, translations: {} as Translations,
    initialPendingApprovalRequest: false, initialPendingApprovalMessage: '', onChatCreated,
  }));
  return { ...hook, onChatCreated };
};

describe('usePreviewChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateQueryData.mockReturnValue('patch');
    mocks.dispatch.mockReturnValue({ undo: mocks.undo });
  });

  it('shows the first message and a chat list entry while the chat is being created', async () => {
    const request = deferred<{ chat_id: string }>();
    mocks.createChat.mockReturnValue({ unwrap: () => request.promise });
    const { result, onChatCreated } = setup();

    let sending!: Promise<void>;
    act(() => { sending = result.current.handleSendMessagePreview(); });

    expect(result.current.previewMessageInput).toBe('');
    expect(result.current.previewFailedMessages).toHaveLength(1);
    expect(result.current.previewFailedMessages[0]).toMatchObject({ content: 'hello', is_own: true });
    expect(result.current.previewFailedMessages[0].delivery_error).toBeUndefined();
    expect(mocks.updateQueryData).toHaveBeenCalledWith('getOneOnOneChats', 'alice', expect.any(Function));
    const draft = { chats: [] as Array<Record<string, unknown>> };
    mocks.updateQueryData.mock.calls[0][2](draft);
    expect(draft.chats[0]).toMatchObject({ id: -5, interlocutor_name: 'bob', interlocutor_display_name: 'Bob' });
    expect(result.current.isCreatingPreviewChat).toBe(true);

    await act(async () => { request.resolve({ chat_id: '42' }); await sending; });
    expect(onChatCreated).toHaveBeenCalledWith('42', 'bob');
    expect(mocks.undo).not.toHaveBeenCalled();
    expect(result.current.previewFailedMessages).toHaveLength(1);
  });

  it('marks the optimistic message as failed and removes the list entry when creating the chat fails', async () => {
    mocks.createChat.mockReturnValue({ unwrap: () => Promise.reject(new Error('offline')) });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result, onChatCreated } = setup();

    await act(async () => { await result.current.handleSendMessagePreview(); });

    expect(onChatCreated).not.toHaveBeenCalled();
    expect(mocks.undo).toHaveBeenCalledOnce();
    expect(result.current.previewFailedMessages).toHaveLength(1);
    expect(result.current.previewFailedMessages[0].delivery_error).toBeTruthy();
  });

  it('creates the chat once when two messages are sent in the same tick and sends both in order', async () => {
    const request = deferred<{ chat_id: string }>();
    mocks.createChat.mockReturnValue({ unwrap: () => request.promise });
    mocks.post.mockResolvedValue({ data: { id: '43' }, response: new Response('{}', { status: 201 }) });
    const { result, onChatCreated } = setup();

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.handleSendMessagePreview();
      second = result.current.handleSendMessagePreview();
    });

    expect(result.current.previewFailedMessages).toHaveLength(2);
    const [one, two] = result.current.previewFailedMessages;
    expect(one.id).not.toBe(two.id);
    expect(one.client_temp_id).not.toBe(two.client_temp_id);

    await act(async () => { request.resolve({ chat_id: '42' }); await Promise.all([first, second]); });
    expect(mocks.createChat).toHaveBeenCalledOnce();
    expect(mocks.createChat).toHaveBeenCalledWith(expect.objectContaining({ user2: 'bob', initial_message: 'hello' }));
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledWith('/chats/{chat_id}/messages', expect.objectContaining({
      params: { path: { chat_id: '42' } },
      body: { client_temp_id: String(two.client_temp_id), type: 'text', content: 'hello' },
    }));
    expect(onChatCreated).toHaveBeenCalledOnce();
    expect(onChatCreated).toHaveBeenCalledWith('42', 'bob');
    expect(result.current.previewFailedMessages.every(message => !message.delivery_error)).toBe(true);
  });
});
