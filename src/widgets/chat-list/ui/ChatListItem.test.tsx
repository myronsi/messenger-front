import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Chat } from '@/entities/message';
import ChatListItem from './ChatListItem';

let snapshot = { preferences: { enabled: true, sound: true, previews: false }, mutes: [] as { chat_id: string; until: string }[] };
vi.mock('@/shared/lib/notifications/api', () => ({
  subscribeNotifications: () => () => undefined,
  notificationSnapshot: () => snapshot,
  muteNotifications: vi.fn(),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));

const chat = { id: '7', name: 'alice', display_name: 'Alice', type: 'one-on-one', unread_count: 3 } as Chat;
const renderItem = () => render(
  <ChatListItem
    chat={chat} translations={en} getLastMessagePreview={() => ''} getLastMessageTime={() => ''}
    isOwnLastMessage={() => false} isOwnLastMessageRead={() => false} onClick={vi.fn()} onContextMenu={vi.fn()}
  />,
);

describe('ChatListItem', () => {
  beforeEach(() => { snapshot = { ...snapshot, mutes: [] }; });

  it('shows the unread count in the accent colour for a normal chat', () => {
    renderItem();
    expect(screen.queryByTestId('chat-muted-icon')).not.toBeInTheDocument();
    expect(screen.getByText('3')).toHaveClass('bg-primary');
  });

  it('marks a muted chat with an icon and a grey unread count', () => {
    snapshot = { ...snapshot, mutes: [{ chat_id: '7', until: '9999-01-01T00:00:00Z' }] };
    renderItem();
    expect(screen.getByTestId('chat-muted-icon')).toBeInTheDocument();
    expect(screen.getByText('3')).toHaveClass('bg-gray-400');
    expect(screen.getByText('3')).not.toHaveClass('bg-primary');
  });
});
