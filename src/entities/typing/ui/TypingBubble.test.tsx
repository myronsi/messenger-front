import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerEvent } from '@myronsi/messenger-api';
import { LanguageProvider } from '@/shared/contexts/LanguageProvider';
import { applyTypingFrame, clearTypingUsers } from '../model/typingStore';
import { TypingBubble } from './TypingBubble';

const names: Record<string, string> = { '7': 'Anna', '8': 'Ben' };
vi.mock('@/entities/user', () => ({
  useGetUserByIdQuery: (id: unknown) => ({ data: typeof id === 'string' ? { display_name: names[id] } : undefined }),
}));

const typing = (userId: string, action = 'typing', isTyping = true) => ({
  type: 'typing', event_id: '1', chat_id: '5', data: { user_id: userId, is_typing: isTyping, action },
}) as ServerEvent;
const renderBubble = (isGroup: boolean) => {
  localStorage.setItem('language', 'en');
  return render(<LanguageProvider><TypingBubble chatId="5" isGroup={isGroup} /></LanguageProvider>);
};

describe('TypingBubble', () => {
  afterEach(() => {
    act(() => clearTypingUsers());
    vi.useRealTimers();
  });

  it('shows nothing while nobody types', () => {
    renderBubble(false);
    expect(screen.queryByTestId('typing-bubble')).not.toBeInTheDocument();
  });

  it('waves the letters of the word in a direct chat and keeps the whole word for screen readers', () => {
    renderBubble(false);
    act(() => applyTypingFrame(typing('7')));
    const label = screen.getByTestId('typing-label');
    expect(label).toHaveClass('letter-wave-wave');
    expect(label.querySelector('.sr-only')).toHaveTextContent('typing…');
    expect(label.querySelectorAll('.letter-wave-unit')).toHaveLength('typing…'.length);
  });

  it('names the members who type in a group', () => {
    renderBubble(true);
    act(() => applyTypingFrame(typing('7', 'recording_voice')));
    expect(screen.getByTestId('typing-label').querySelector('.sr-only')).toHaveTextContent('Anna is recording voice…');
    act(() => applyTypingFrame(typing('8')));
    expect(screen.getByTestId('typing-label').querySelector('.sr-only')).toHaveTextContent('Anna and Ben are typing…');
  });

  it('shows a red recording dot while recording voice', () => {
    renderBubble(false);
    act(() => applyTypingFrame(typing('7', 'recording_voice')));
    expect(screen.getByTestId('typing-rec-dot')).toBeInTheDocument();
    expect(screen.getByTestId('typing-bubble').firstElementChild?.firstElementChild).toHaveClass('text-destructive');
  });

  it('cycles small stickers after the words while choosing a sticker', () => {
    renderBubble(false);
    act(() => applyTypingFrame(typing('7', 'choosing_sticker')));
    expect(screen.getByTestId('typing-sticker-cycle').querySelectorAll('.typing-sticker')).toHaveLength(4);
    expect(screen.getByTestId('typing-label')).toHaveClass('letter-wave-wave');
  });

  it.each(['uploading_photo', 'uploading_video', 'uploading_file'])('sweeps colour through the words while %s', (action) => {
    renderBubble(false);
    act(() => applyTypingFrame(typing('7', action)));
    expect(screen.getByTestId('typing-label')).toHaveClass('letter-wave-sweep');
    expect(screen.queryByTestId('typing-rec-dot')).not.toBeInTheDocument();
  });

  it('shrinks the bubble away before removing it when typing stops', () => {
    vi.useFakeTimers();
    renderBubble(false);
    act(() => applyTypingFrame(typing('7')));
    expect(screen.getByTestId('typing-bubble')).not.toHaveClass('typing-bubble-closing');
    act(() => applyTypingFrame(typing('7', 'typing', false)));
    expect(screen.getByTestId('typing-bubble')).toHaveClass('typing-bubble-closing');
    act(() => { vi.advanceTimersByTime(220); });
    expect(screen.queryByTestId('typing-bubble')).not.toBeInTheDocument();
  });

  it('stays open when typing starts again while it is closing', () => {
    vi.useFakeTimers();
    renderBubble(false);
    act(() => applyTypingFrame(typing('7')));
    act(() => applyTypingFrame(typing('7', 'typing', false)));
    act(() => applyTypingFrame(typing('7')));
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByTestId('typing-bubble')).not.toHaveClass('typing-bubble-closing');
  });
});
