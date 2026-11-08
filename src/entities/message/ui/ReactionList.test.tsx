import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReactionList from './ReactionList';

const reactions = [
  { user_id: '1', reaction: '👍' },
  { user_id: '2', reaction: '👍' },
  { user_id: '2', reaction: '❤️' },
];

const setup = (isMine = false, onOpenReactionDetails?: ComponentProps<typeof ReactionList>['onOpenReactionDetails']) => {
  const send = vi.fn();
  const wsRef = { current: { readyState: WebSocket.OPEN, send } as unknown as WebSocket };
  render(<ReactionList reactions={reactions} messageId="99" userId="1" isMine={isMine} wsRef={wsRef} onOpenReactionDetails={onOpenReactionDetails} />);
  return send;
};

describe('ReactionList', () => {
  it.each([true, false])('colours your reactions by message ownership (own: %s)', (isMine) => {
    setup(isMine);
    const mine = screen.getByRole('button', { name: /👍\s*2/ });
    expect(mine).toHaveClass(isMine ? 'bg-background' : 'bg-primary');
    expect(mine).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '❤️' })).toHaveClass('bg-accent-darker');
  });

  it('adds or removes exactly the clicked reaction', () => {
    const send = setup();
    fireEvent.click(screen.getByRole('button', { name: /👍\s*2/ }));
    fireEvent.click(screen.getByRole('button', { name: '❤️' }));
    expect(send.mock.calls.map(([payload]) => JSON.parse(payload))).toEqual([
      { type: 'reaction_remove', message_id: '99', reaction: '👍' },
      { type: 'reaction_add', message_id: '99', reaction: '❤️' },
    ]);
  });

  it('does not advertise a people list without a details action', () => {
    setup();
    expect(screen.getByRole('button', { name: /👍\s*2/ })).toHaveAttribute('title', 'Click to toggle.');
  });

  it('offers the people list when a group supplies the details action', () => {
    const details = vi.fn();
    setup(false, details);
    const button = screen.getByRole('button', { name: /👍\s*2/ });
    expect(button).toHaveAttribute('title', expect.stringContaining('Right-click to view people.'));
    fireEvent.contextMenu(button);
    expect(details).toHaveBeenCalledWith('👍', reactions.slice(0, 2));
  });
});
