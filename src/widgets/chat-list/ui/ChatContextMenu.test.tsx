import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import ChatContextMenu from './ChatContextMenu';

vi.mock('@/features/chat-mute', () => ({ ChatMuteMenuItems: () => <button type="button">Mute</button> }));

describe('ChatContextMenu', () => {
  it('lists the chat actions after the usual items and runs the chosen one', () => {
    const onBlock = vi.fn();
    render(
      <ChatContextMenu
        menu={{ chatId: '7', x: 10, y: 10, isPinned: false, isArchived: false, unreadCount: 0 }}
        unreadCount={0}
        translations={en}
        onMarkAsRead={vi.fn()}
        onTogglePinned={vi.fn()}
        onToggleArchived={vi.fn()}
        onClose={vi.fn()}
        onError={vi.fn()}
        actions={[
          { key: 'clear', label: 'Clear history', icon: null, onSelect: vi.fn() },
          { key: 'delete', label: 'Delete chat', icon: null, danger: true, onSelect: vi.fn() },
          { key: 'block', label: 'Block', icon: null, danger: true, onSelect: onBlock },
          { key: 'report', label: 'Report', icon: null, danger: true, onSelect: vi.fn() },
        ]}
      />,
    );
    const labels = screen.getAllByRole('button').map((button) => button.textContent);
    expect(labels.slice(-5)).toEqual(['Mute', 'Clear history', 'Delete chat', 'Block', 'Report']);
    expect(screen.getByRole('button', { name: 'Delete chat' })).toHaveClass('text-destructive');
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    expect(onBlock).toHaveBeenCalledOnce();
  });
});
