import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { Message } from '@/entities/message';
import { useScrollToBottom } from './useScrollToBottom';

const live = (id: string, extra: Partial<Message> = {}): Message => ({ id, sender: 'Anna', content: 'hi', timestamp: 't', type: 'message', read_by: [], is_live: true, ...extra });

it('counts new live messages from others but not service lines', () => {
  const { result } = renderHook(() => useScrollToBottom({
    chatContainerRef: { current: null }, messageRefs: { current: {} }, messages: [], isPositioned: true, hasMoreNewerMessages: false,
    isOwnMessage: () => false, shouldStickToBottomRef: { current: false }, autoScrollUntilRef: { current: 0 },
  }));
  act(() => result.current.countIncoming([live('1'), live('2', { system_event: { kind: 'member_joined', actor_id: '5', actor_name: 'Max' } })]));
  expect(result.current.unseenCount).toBe(1);
});
