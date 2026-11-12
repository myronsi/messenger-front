import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerEvent } from '@myronsi/messenger-api';
import { applyTypingFrame, clearTypingUsers, TYPING_EXPIRY_MS, useTypingUsers } from './typingStore';

const typing = (chatId: string, userId: string, isTyping: boolean, action: string = 'typing') => ({
  type: 'typing', event_id: '1', chat_id: chatId, data: { user_id: userId, is_typing: isTyping, action },
}) as ServerEvent;
const message = (chatId: string, senderId: string) => ({
  type: 'message', event_id: '2', chat_id: chatId, data: { message: { id: '9', sender: { id: senderId } } },
}) as unknown as ServerEvent;

describe('typing store', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { act(() => clearTypingUsers()); vi.useRealTimers(); });

  it('lists who types in each chat and removes them when they stop', () => {
    const { result } = renderHook(() => useTypingUsers('5'));
    act(() => { applyTypingFrame(typing('5', '7', true)); applyTypingFrame(typing('6', '8', true)); });
    expect(result.current).toEqual([{ userId: '7', action: 'typing' }]);
    act(() => applyTypingFrame(typing('5', '7', false)));
    expect(result.current).toEqual([]);
  });

  it('switches the action and treats an unknown one as typing', () => {
    const { result } = renderHook(() => useTypingUsers('5'));
    act(() => applyTypingFrame(typing('5', '7', true, 'recording_voice')));
    expect(result.current).toEqual([{ userId: '7', action: 'recording_voice' }]);
    act(() => applyTypingFrame(typing('5', '7', true, 'uploading_photo')));
    expect(result.current).toEqual([{ userId: '7', action: 'uploading_photo' }]);
    act(() => applyTypingFrame(typing('5', '7', true, 'dancing')));
    expect(result.current).toEqual([{ userId: '7', action: 'typing' }]);
  });

  it('hides a user when no repeat arrives in time', () => {
    const { result } = renderHook(() => useTypingUsers('5'));
    act(() => applyTypingFrame(typing('5', '7', true)));
    act(() => vi.advanceTimersByTime(TYPING_EXPIRY_MS - 1000));
    act(() => applyTypingFrame(typing('5', '7', true)));
    act(() => vi.advanceTimersByTime(TYPING_EXPIRY_MS - 1000));
    expect(result.current).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toEqual([]);
  });

  it('removes the sender of a new message at once', () => {
    const { result } = renderHook(() => useTypingUsers('5'));
    act(() => { applyTypingFrame(typing('5', '7', true)); applyTypingFrame(typing('5', '8', true)); });
    act(() => applyTypingFrame(message('5', '7')));
    expect(result.current).toEqual([{ userId: '8', action: 'typing' }]);
  });

  it('keeps the same list object for chats that did not change', () => {
    const { result } = renderHook(() => useTypingUsers('5'));
    act(() => applyTypingFrame(typing('5', '7', true)));
    const before = result.current;
    act(() => applyTypingFrame(typing('6', '8', true)));
    act(() => applyTypingFrame(typing('5', '7', true)));
    expect(result.current).toBe(before);
  });
});
