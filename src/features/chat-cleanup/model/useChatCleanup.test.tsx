import { act, render, renderHook, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatCleanup } from './useChatCleanup';
import { usePendingChatRemovals } from './pendingRemovals';

const mocks = vi.hoisted(() => ({
  deleteChat: vi.fn(), clearHistory: vi.fn(),
  toasts: [] as (() => ReactNode)[],
}));

vi.mock('@/entities/chat', () => ({
  useDeleteChatMutation: () => [mocks.deleteChat],
  useClearChatHistoryMutation: () => [mocks.clearHistory],
}));
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/sonner', () => ({
  toast: Object.assign(vi.fn(), {
    custom: (render: () => ReactNode) => { mocks.toasts.push(render); return mocks.toasts.length; },
    dismiss: vi.fn(),
  }),
}));

const target = { chatId: '9', name: 'Anna', isGroup: false, isSaved: false, canClearForEveryone: false };
const ok = () => ({ unwrap: () => Promise.resolve() });

const setup = () => {
  const onDone = vi.fn();
  const onError = vi.fn();
  const hook = renderHook(() => ({ cleanup: useChatCleanup(onDone, onError), hidden: usePendingChatRemovals() }));
  return { hook, onDone, onError };
};

describe('useChatCleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.deleteChat.mockReset().mockReturnValue(ok());
    mocks.clearHistory.mockReset().mockReturnValue(ok());
    mocks.toasts.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('hides the chat at once and deletes it only after the countdown', async () => {
    const { hook, onDone } = setup();
    act(() => hook.result.current.cleanup.open({ kind: 'delete', target }));
    act(() => hook.result.current.cleanup.confirm(true));
    expect(onDone).toHaveBeenCalledWith({ kind: 'delete', target }, 'everyone');
    expect(hook.result.current.hidden.has('9')).toBe(true);
    expect(mocks.deleteChat).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(mocks.deleteChat).toHaveBeenCalledWith({ chatId: '9', scope: 'everyone' });
  });

  it('brings the chat back and calls nothing when undone', async () => {
    const { hook } = setup();
    act(() => hook.result.current.cleanup.open({ kind: 'delete', target }));
    act(() => hook.result.current.cleanup.confirm(false));
    render(<>{mocks.toasts[0]()}</>);
    expect(screen.getByTestId('undo-toast')).toHaveTextContent('Chat deleted');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(hook.result.current.hidden.has('9')).toBe(false);
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(mocks.deleteChat).not.toHaveBeenCalled();
  });

  it('clears the history after the countdown', async () => {
    const { hook } = setup();
    act(() => hook.result.current.cleanup.open({ kind: 'clear', target: { ...target, chatId: '10' } }));
    act(() => hook.result.current.cleanup.confirm(false));
    expect(hook.result.current.hidden.has('10')).toBe(false);
    await act(async () => { vi.advanceTimersByTime(4900); });
    expect(mocks.clearHistory).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(mocks.clearHistory).toHaveBeenCalledWith({ chatId: '10', scope: 'me' });
  });

  it('shows the chat again and reports the error when deleting fails', async () => {
    mocks.deleteChat.mockReturnValue({ unwrap: () => Promise.reject({ data: { detail: 'Nope' } }) });
    const { hook, onError } = setup();
    act(() => hook.result.current.cleanup.open({ kind: 'delete', target: { ...target, chatId: '11' } }));
    act(() => hook.result.current.cleanup.confirm(false));
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(onError).toHaveBeenCalledWith('Nope');
    expect(hook.result.current.hidden.has('11')).toBe(false);
  });
});
