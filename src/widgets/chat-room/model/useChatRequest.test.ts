import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatRequest } from './useChatRequest';

const api = vi.hoisted(() => ({
  chats: [] as { id: string; is_request?: boolean }[],
  accept: vi.fn(),
  remove: vi.fn(),
  block: vi.fn(),
  dispatch: vi.fn(),
}));
const ok = () => ({ unwrap: () => Promise.resolve() });

vi.mock('@/entities/chat', () => ({
  chatApi: { util: { invalidateTags: (tags: string[]) => ({ type: 'invalidate', tags }) } },
  useGetOneOnOneChatsQuery: (_: string, options: { selectFromResult: (state: { data: unknown }) => unknown }) =>
    options.selectFromResult({ data: { chats: api.chats } }),
  useAcceptChatRequestMutation: () => [api.accept],
  useDeleteChatMutation: () => [api.remove],
}));
vi.mock('@/entities/user', () => ({ useBlockUserMutation: () => [api.block] }));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => api.dispatch }));

const setup = (chatId = '7') => {
  const onBack = vi.fn();
  const onError = vi.fn();
  const hook = renderHook(() => useChatRequest({ chatId, chatName: 'stranger', username: 'me', onBack, onError, fallbackError: 'failed' }));
  return { ...hook, onBack, onError };
};

describe('useChatRequest', () => {
  beforeEach(() => {
    api.chats = [{ id: '7', is_request: true }, { id: '8' }];
    [api.accept, api.remove, api.block, api.dispatch].forEach((fn) => fn.mockReset());
    [api.accept, api.remove, api.block].forEach((fn) => fn.mockImplementation(ok));
  });

  it('sends no reads in a request chat and reads again once it is accepted', async () => {
    const mark = vi.fn();
    const { result } = setup();
    expect(result.current.isRequest).toBe(true);
    expect(result.current.readMarker(mark)).toBeUndefined();
    await act(() => result.current.accept());
    expect(api.accept).toHaveBeenCalledWith('7');
    expect(result.current.isRequest).toBe(false);
    expect(result.current.readMarker(mark)).toBe(mark);
  });

  it('reads normally in a chat that is not a request', () => {
    const mark = vi.fn();
    const { result } = setup('8');
    expect(result.current.isRequest).toBe(false);
    expect(result.current.readMarker(mark)).toBe(mark);
  });

  it('keeps the request when accepting fails and reports the error', async () => {
    api.accept.mockImplementation(() => ({ unwrap: () => Promise.reject({ data: { detail: 'nope' } }) }));
    const { result, onError } = setup();
    await act(() => result.current.accept());
    expect(result.current.isRequest).toBe(true);
    expect(onError).toHaveBeenCalledWith('nope');
  });

  it('refreshes the list once a reply is sent and leaves the move to the server', async () => {
    const send = vi.fn((_text: string) => Promise.resolve('sent'));
    const { result } = setup();
    let returned: Promise<string> | undefined;
    await act(async () => { returned = result.current.withReply(send)('hello'); await returned; });
    expect(send).toHaveBeenCalledWith('hello');
    expect(await returned).toBe('sent');
    expect(result.current.isRequest).toBe(true);
    expect(api.dispatch).toHaveBeenCalledWith({ type: 'invalidate', tags: ['Chat'] });
  });

  it('keeps reads off when the reply fails', async () => {
    const mark = vi.fn();
    const send = vi.fn((_text: string) => Promise.reject(new Error('offline')));
    const { result } = setup();
    await act(async () => { await result.current.withReply(send)('hello').catch(() => undefined); });
    expect(result.current.isRequest).toBe(true);
    expect(result.current.readMarker(mark)).toBeUndefined();
  });

  it('deletes the request for me and goes back', async () => {
    const { result, onBack } = setup();
    await act(() => result.current.remove());
    expect(api.remove).toHaveBeenCalledWith({ chatId: '7', scope: 'me' });
    expect(api.block).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });

  it('blocks the sender, deletes the request for me and goes back', async () => {
    const { result, onBack } = setup();
    await act(() => result.current.block());
    expect(api.block).toHaveBeenCalledWith('stranger');
    expect(api.remove).toHaveBeenCalledWith({ chatId: '7', scope: 'me' });
    expect(onBack).toHaveBeenCalled();
  });
});
