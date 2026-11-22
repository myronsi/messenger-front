import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { resetDoubleTapReaction, resetReactionUsage, setDoubleTapReaction } from '@/entities/message';
import { DOUBLE_TAP_MS, useMessageTap } from './useMessageTap';

const message = { id: '42', reactions: [] } as unknown as Message;
const bubble = document.createElement('div');
bubble.className = 'motion-message-bubble';
const tap = (type = 'click') => ({ type, target: bubble, clientX: 10, clientY: 20, preventDefault: vi.fn() }) as unknown as React.MouseEvent;

const setup = (width: number, menuOpen = false) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  const onMessageClick = vi.fn();
  const send = vi.fn();
  const wsRef = { current: { readyState: WebSocket.OPEN, send, close: vi.fn() } };
  const { result } = renderHook(() => useMessageTap({ onMessageClick, userId: '1', wsRef, lastScrollAtRef: { current: 0 }, canReact: true, menuOpen }));
  const sent = () => send.mock.calls.map(([payload]) => JSON.parse(payload));
  return { handle: result.current, onMessageClick, sent };
};

describe('useMessageTap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    resetReactionUsage();
    resetDoubleTapReaction();
  });
  afterEach(() => vi.useRealTimers());

  it('opens the menu after a single tap on a phone', () => {
    const { handle, onMessageClick, sent } = setup(375);
    handle(tap(), message);
    expect(onMessageClick).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(DOUBLE_TAP_MS); });
    expect(onMessageClick).toHaveBeenCalledTimes(1);
    expect(sent()).toEqual([]);
  });

  it('reacts with a heart on a double tap instead of opening the menu', () => {
    const { handle, onMessageClick, sent } = setup(375);
    handle(tap(), message);
    handle(tap(), message);
    handle(tap('dblclick'), message);
    act(() => { vi.advanceTimersByTime(DOUBLE_TAP_MS); });
    expect(onMessageClick).not.toHaveBeenCalled();
    expect(sent()).toEqual([{ type: 'reaction_add', message_id: '42', reaction: '❤️' }]);
  });

  it('reacts on a desktop double click and passes single clicks straight on', () => {
    const { handle, onMessageClick, sent } = setup(1280);
    handle(tap(), message);
    expect(onMessageClick).toHaveBeenCalledTimes(1);
    handle(tap('dblclick'), message);
    expect(sent()).toEqual([{ type: 'reaction_add', message_id: '42', reaction: '❤️' }]);
  });

  it('closes an open menu on the first tap without waiting', () => {
    const { handle, onMessageClick } = setup(375, true);
    handle(tap(), message);
    expect(onMessageClick).toHaveBeenCalledTimes(1);
  });

  it('hands a tap straight on, without the double-tap wait, while the open menu is already closing', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    const onMessageClick = vi.fn();
    const wsRef = { current: { readyState: WebSocket.OPEN, send: vi.fn(), close: vi.fn() } };
    const { result, rerender } = renderHook(({ menuOpen }) => useMessageTap({
      onMessageClick, userId: '1', wsRef, lastScrollAtRef: { current: 0 }, canReact: true, menuOpen,
    }), { initialProps: { menuOpen: true } });
    rerender({ menuOpen: false });
    result.current(tap(), message);
    expect(onMessageClick).toHaveBeenCalledTimes(1);
  });

  it('uses the reaction chosen in Personalization, and opens the menu at once when it is off', () => {
    setDoubleTapReaction('1', '👍');
    const first = setup(375);
    first.handle(tap(), message);
    first.handle(tap(), message);
    expect(first.sent()).toEqual([{ type: 'reaction_add', message_id: '42', reaction: '👍' }]);
    setDoubleTapReaction('1', '');
    const second = setup(375);
    second.handle(tap(), message);
    expect(second.onMessageClick).toHaveBeenCalledTimes(1);
    second.handle(tap(), message);
    expect(second.sent()).toEqual([]);
  });
});
