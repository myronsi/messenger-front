import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordReaction, resetReactionUsage, ReactionBurstHost, type Message } from '@/entities/message';
import ReactionMenu from './ReactionMenu';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('./ReactionPicker', () => ({
  ReactionPicker: ({ onPick }: { onPick: (reaction: string) => void }) => <button type="button" onClick={() => onPick('🦄')}>picker</button>,
}));

const message = { id: '7', reactions: [{ user_id: '1', reaction: '😂' }] } as unknown as Message;

const setup = () => {
  const send = vi.fn();
  const onClose = vi.fn();
  const contextMenuRef = createRef<HTMLDivElement>();
  render(
    <>
      <div ref={contextMenuRef} data-testid="context-menu" />
      <ReactionMenu ref={createRef<HTMLDivElement>()} reactionMenu={{ message, x: 50, y: 60 }} userId="1" onClose={onClose}
        wsRef={{ current: { readyState: WebSocket.OPEN, send, close: vi.fn() } }} setReactionMenu={vi.fn()}
        contextMenu={{ x: 0, y: 0, messageId: '7', isMine: false } as never} setContextMenu={vi.fn()} contextMenuRef={contextMenuRef} />
      <ReactionBurstHost />
    </>,
  );
  return () => send.mock.calls.map(([payload]) => JSON.parse(payload));
};

describe('ReactionMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    resetReactionUsage();
  });

  it('shows your most used reactions first, marks the ones you already gave and bursts on react', () => {
    recordReaction('1', '🔥');
    const sent = setup();
    const quick = screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'));
    expect(quick.map((button) => button.textContent)).toEqual(['🔥', '❤️', '👍', '😂', '🥰', '😢']);
    expect(screen.getByRole('button', { name: '😂' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '❤️' }));
    fireEvent.click(screen.getByRole('button', { name: '😂' }));
    expect(sent()).toEqual([
      { type: 'reaction_add', message_id: '7', reaction: '❤️' },
      { type: 'reaction_remove', message_id: '7', reaction: '😂' },
    ]);
    expect(screen.getAllByTestId('reaction-burst')).toHaveLength(1);
  });

  it('grows the bar into the full picker and hides the actions behind it', () => {
    const sent = setup();
    const more = screen.getByRole('button', { name: 'More reactions' });
    expect(screen.queryByText('picker')).toBeNull();
    act(() => { fireEvent.click(more); });
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('context-menu')).toHaveAttribute('data-picker-dimmed');
    fireEvent.click(screen.getByText('picker'));
    expect(sent()).toEqual([{ type: 'reaction_add', message_id: '7', reaction: '🦄' }]);
  });
});
