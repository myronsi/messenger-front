import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { useChatInteractions } from './useChatInteractions';

const message = (id: string) => ({ id, sender: 'anna', content: 'hi', timestamp: '', type: 'message', read_by: [] }) as unknown as Message;
const tap = (x: number, y: number) => ({
  type: 'contextmenu', clientX: x, clientY: y, preventDefault: vi.fn(), stopPropagation: vi.fn(),
}) as unknown as React.MouseEvent;

const render = () => renderHook(() => {
  const [contextMenu, setContextMenu] = useState<Parameters<typeof useChatInteractions>[0]['contextMenu']>(null);
  const [reactionMenu, setReactionMenu] = useState<Parameters<typeof useChatInteractions>[0]['reactionMenu']>(null);
  const [, setIsClosing] = useState(false);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({ 1: document.createElement('div'), 2: document.createElement('div') });
  const interactions = useChatInteractions({
    chatName: 'anna', username: 'me', userId: '7', interlocutorDeleted: false, messages: [message('1'), message('2')],
    contextMenu, setContextMenu, reactionMenu, setReactionMenu, setIsClosing,
    closeMenus: () => { setContextMenu(null); setReactionMenu(null); },
    messageRefs, setIsUserProfileOpen: vi.fn(), scrollToMessage: vi.fn(), setTempHighlightedMessageId: vi.fn(),
  });
  return { ...interactions, contextMenu, reactionMenu };
});

describe('useChatInteractions menus', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only closes the open menu when another message is tapped, without opening a new one', () => {
    const { result } = render();
    act(() => result.current.handleMessageClick(tap(100, 300), message('1')));
    expect(result.current.contextMenu?.messageId).toBe('1');
    act(() => result.current.handleMessageClick(tap(100, 500), message('2')));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.contextMenu).toBeNull();
    expect(result.current.reactionMenu).toBeNull();
  });

  it('closes the menu when the same message is tapped again', () => {
    const { result } = render();
    act(() => result.current.handleMessageClick(tap(100, 300), message('1')));
    act(() => result.current.handleMessageClick(tap(100, 300), message('1')));
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.contextMenu).toBeNull();
  });
});
