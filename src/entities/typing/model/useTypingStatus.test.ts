import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { TYPING_IDLE_MS, TYPING_REPEAT_MS, useTypingStatus } from './useTypingStatus';

const sendIfOpen = vi.hoisted(() => vi.fn((_event: unknown) => true));
vi.mock('@/shared/api/realtime', () => ({ realtime: { sendIfOpen } }));

interface Props { chatId: string; text: string; canType: boolean; isRecording: boolean }
const start: Props = { chatId: '5', text: '', canType: true, isRecording: false };
const sent = () => sendIfOpen.mock.calls.map(([event]) => {
  const { chat_id: chat, data } = event as { chat_id: string; data: { is_typing: boolean; action: string } };
  return `${chat}:${data.is_typing ? data.action : `stop ${data.action}`}`;
});

describe('useTypingStatus', () => {
  beforeEach(() => { vi.useFakeTimers(); sendIfOpen.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sends typing on input, repeats it and stops after a pause', () => {
    const { rerender } = renderHook((props: Props) => useTypingStatus(props), { initialProps: start });
    rerender({ ...start, text: 'H' });
    rerender({ ...start, text: 'Hi' });
    expect(sent()).toEqual(['5:typing']);
    act(() => vi.advanceTimersByTime(TYPING_REPEAT_MS));
    expect(sent()).toEqual(['5:typing', '5:typing']);
    act(() => vi.advanceTimersByTime(TYPING_IDLE_MS - TYPING_REPEAT_MS));
    expect(sent()).toEqual(['5:typing', '5:typing', '5:stop typing']);
  });

  it('stops when the text is sent or cleared', () => {
    const { rerender } = renderHook((props: Props) => useTypingStatus(props), { initialProps: start });
    rerender({ ...start, text: 'Hi' });
    rerender({ ...start, text: '' });
    expect(sent()).toEqual(['5:typing', '5:stop typing']);
  });

  it('does not report a restored draft, an edit or a temporary chat', () => {
    const { rerender } = renderHook((props: Props) => useTypingStatus(props), { initialProps: { ...start, text: 'draft' } });
    rerender({ ...start, text: 'draft', canType: false });
    rerender({ ...start, text: 'draft edited', canType: false });
    rerender({ ...start, chatId: 'temp-1', text: 'x' });
    rerender({ ...start, chatId: 'temp-1', text: 'xy' });
    expect(sent()).toEqual([]);
  });

  it('reports recording a voice message', () => {
    const { rerender } = renderHook((props: Props) => useTypingStatus(props), { initialProps: start });
    rerender({ ...start, isRecording: true });
    act(() => vi.advanceTimersByTime(TYPING_REPEAT_MS));
    rerender({ ...start, isRecording: false });
    expect(sent()).toEqual(['5:recording_voice', '5:recording_voice', '5:stop recording_voice']);
  });

  it('stops in the old chat when the chat changes', () => {
    const { rerender, unmount } = renderHook((props: Props) => useTypingStatus(props), { initialProps: start });
    rerender({ ...start, text: 'Hi' });
    rerender({ ...start, chatId: '6', text: 'other draft' });
    expect(sent()).toEqual(['5:typing', '5:stop typing']);
    rerender({ ...start, chatId: '6', text: 'other draft!' });
    unmount();
    expect(sent()).toEqual(['5:typing', '5:stop typing', '6:typing', '6:stop typing']);
  });
});
