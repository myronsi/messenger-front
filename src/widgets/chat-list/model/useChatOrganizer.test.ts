import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Chat } from '@/entities/message';
import { useChatOrganizer } from './useChatOrganizer';

const api = vi.hoisted(() => ({ archive: vi.fn(), pin: vi.fn(), reorder: vi.fn() }));
const toastMock = vi.hoisted(() => vi.fn());
const ok = () => ({ unwrap: () => Promise.resolve() });
vi.mock('@/entities/chat', () => ({
  useSetChatArchivedMutation: () => [api.archive],
  useSetChatPinnedMutation: () => [api.pin],
  useReorderPinnedChatsMutation: () => [api.reorder],
}));
vi.mock('@/shared/ui/sonner', () => ({ toast: toastMock }));

type ToastOptions = { action: { label: string; onClick: () => void } };

const chats = {
  a: { id: 'a', name: 'Ana', is_pinned: true, pin_position: 0 },
  b: { id: 'b', name: 'Ben', is_pinned: true, pin_position: 1 },
} as unknown as Record<string, Chat>;

const setup = () => {
  const setChatOverrides = vi.fn();
  const refetch = vi.fn();
  const { result } = renderHook(() => useChatOrganizer({
    chatsByIdRef: { current: chats }, setChatOverrides, setChatContextMenu: vi.fn(), setModal: vi.fn(), refetch, translations: en,
  }));
  return { result, refetch };
};

describe('useChatOrganizer archive undo', () => {
  beforeEach(() => {
    [api.archive, api.pin, api.reorder, toastMock].forEach((fn) => fn.mockReset());
    [api.archive, api.pin, api.reorder].forEach((fn) => fn.mockImplementation(ok));
  });

  it('offers Undo after archiving and restores the pinned chat in its old place', async () => {
    const { result } = setup();
    await act(() => result.current.handleToggleArchived('b'));
    expect(api.archive).toHaveBeenCalledWith({ chatId: 'b', archived: true });
    const [message, options] = toastMock.mock.lastCall as [string, ToastOptions];
    expect(message).toBe(en.chatOrganizer.archived);
    expect(options.action.label).toBe(en.chatOrganizer.undo);
    await act(async () => { options.action.onClick(); });
    expect(api.archive).toHaveBeenLastCalledWith({ chatId: 'b', archived: false });
    expect(api.pin).toHaveBeenCalledWith({ chatId: 'b', pinned: true });
    expect(api.reorder).toHaveBeenCalledWith(['a', 'b']);
  });
});
