import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { useGroupMessageMenus } from './useGroupMessageMenus';

const message = (id: string) => ({ id, sender: 'anna', content: 'hi' }) as unknown as Message;
const rightClick = (x: number, y: number) => ({
  type: 'contextmenu', clientX: x, clientY: y, preventDefault: vi.fn(), stopPropagation: vi.fn(),
}) as unknown as React.MouseEvent;

describe('useGroupMessageMenus', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only closes the open menu when another message is tapped, without opening a new one', () => {
    const { result } = renderHook(() => useGroupMessageMenus({ isOwnMessage: () => false }));
    act(() => result.current.handleMessageClick(rightClick(100, 300), message('1')));
    expect(result.current.contextMenu?.messageId).toBe('1');

    act(() => result.current.handleMessageClick(rightClick(100, 500), message('2')));
    expect(result.current.isClosing).toBe(true);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.contextMenu).toBeNull();
    expect(result.current.reactionMenu).toBeNull();
  });

  it('closes the menu when the same message is tapped again', () => {
    const { result } = renderHook(() => useGroupMessageMenus({ isOwnMessage: () => false }));
    act(() => result.current.handleMessageClick(rightClick(100, 300), message('1')));
    act(() => result.current.handleMessageClick(rightClick(100, 300), message('1')));
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.contextMenu).toBeNull();
    expect(result.current.reactionMenu).toBeNull();
  });

  it('only closes the open menu from the reaction button of another message', () => {
    const { result } = renderHook(() => useGroupMessageMenus({ isOwnMessage: () => false }));
    act(() => result.current.openMenus(message('1'), { clientX: 10, clientY: 200 } as React.MouseEvent));
    act(() => result.current.openMenus(message('2'), { clientX: 10, clientY: 400 } as React.MouseEvent));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.contextMenu).toBeNull();
  });
});
