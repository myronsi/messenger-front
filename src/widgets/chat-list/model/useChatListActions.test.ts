import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import type { Chat } from '@/entities/message';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { ChatContextMenuState } from './types';
import { useChatListActions } from './useChatListActions';

it.each(['1', '2'])('dismisses the menu first when tapping chat %s, then opens it on the next tap', id => {
  const onChatOpen = vi.fn();
  const { result } = renderHook(() => {
    const [menu, setMenu] = useState<ChatContextMenuState | null>({ chatId: '1', x: 0, y: 0, isPinned: false, isArchived: false, unreadCount: 0 });
    const actions = useChatListActions({
      username: 'alice', chatContextMenu: menu, onChatOpen,
      createChat: () => ({ unwrap: async () => ({}) }),
      setChatPinned: () => ({ unwrap: async () => ({}) }),
      markChatRead: () => ({ unwrap: async () => ({ unread_count: 0, first_unread_message_id: null }) }),
      refetch: vi.fn(), chatsByIdRef: { current: {} }, setChatOverrides: vi.fn(), setChatContextMenu: setMenu,
      setModal: vi.fn(), translations: {} as Translations,
    });
    return { ...actions, menu };
  });
  const chat = { id, name: 'Bob', type: 'one-on-one', avatar_url: '/bob.png' } as Chat;
  act(() => result.current.handleChatClick(chat));
  expect(result.current.menu).toBeNull();
  expect(onChatOpen).not.toHaveBeenCalled();
  act(() => result.current.handleChatClick(chat));
  expect(onChatOpen).toHaveBeenCalledOnce();
  expect(onChatOpen.mock.calls[0][0]).toBe(id);
});
