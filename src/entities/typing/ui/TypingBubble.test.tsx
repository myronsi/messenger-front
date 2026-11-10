import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerEvent } from '@myronsi/messenger-api';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { applyTypingFrame, clearTypingUsers } from '../model/typingStore';
import { TypingBubble } from './TypingBubble';

const names: Record<string, string> = { '7': 'Anna', '8': 'Ben' };
vi.mock('@/entities/user', () => ({
  useGetUserByIdQuery: (id: unknown) => ({ data: typeof id === 'string' ? { display_name: names[id] } : undefined }),
}));

const typing = (userId: string, action = 'typing') => ({
  type: 'typing', event_id: '1', chat_id: '5', data: { user_id: userId, is_typing: true, action },
}) as ServerEvent;
const renderBubble = (isGroup: boolean) => {
  localStorage.setItem('language', 'en');
  return render(<LanguageProvider><TypingBubble chatId="5" isGroup={isGroup} /></LanguageProvider>);
};

describe('TypingBubble', () => {
  afterEach(() => { act(() => clearTypingUsers()); });

  it('shows nothing while nobody types', () => {
    renderBubble(false);
    expect(screen.queryByTestId('typing-bubble')).not.toBeInTheDocument();
  });

  it('shows three dots with a hidden label in a direct chat', () => {
    renderBubble(false);
    act(() => applyTypingFrame(typing('7')));
    expect(screen.getByRole('status').querySelectorAll('.typing-dot')).toHaveLength(3);
    expect(screen.getByTestId('typing-label')).toHaveTextContent('typing…');
    expect(screen.getByTestId('typing-label')).toHaveClass('sr-only');
  });

  it('names the members who type in a group', () => {
    renderBubble(true);
    act(() => applyTypingFrame(typing('7', 'recording_voice')));
    expect(screen.getByTestId('typing-label')).toHaveTextContent('Anna is recording voice…');
    act(() => applyTypingFrame(typing('8')));
    expect(screen.getByTestId('typing-label')).toHaveTextContent('Anna and Ben are typing…');
    expect(screen.getByTestId('typing-label')).not.toHaveClass('sr-only');
  });
});
