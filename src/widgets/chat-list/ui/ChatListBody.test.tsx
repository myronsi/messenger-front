import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Chat } from '@/entities/message';
import ChatListBody from './ChatListBody';

const snapshot = { preferences: { enabled: true, sound: true, previews: false }, mutes: [] };
vi.mock('@/shared/lib/notifications/api', () => ({
  subscribeNotifications: () => () => undefined,
  notificationSnapshot: () => snapshot,
  muteNotifications: vi.fn(),
}));
vi.mock('@/entities/user', () => ({ useGetUserByIdQuery: () => ({ data: undefined }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));

const chat = (id: string, name: string, extra: Partial<Chat> = {}) =>
  ({ id, name, display_name: name, interlocutor_name: name, type: 'one-on-one', avatar_url: '', interlocutor_deleted: false, ...extra }) as Chat;

const renderBody = (chats: Chat[], onToggleArchived = vi.fn()) => render(
  <ChatListBody
    chats={chats} translations={en} getLastMessagePreview={() => ''} getLastMessageTime={() => ''}
    isOwnLastMessage={() => false} isOwnLastMessageRead={() => false} onStartChat={vi.fn()} onChatClick={vi.fn()}
    onChatContextMenu={vi.fn()} onToggleArchived={onToggleArchived} onReorderPinned={vi.fn()}
  />,
);

describe('ChatListBody', () => {
  it('keeps archived chats behind an Archived row with their unread count', () => {
    renderBody([chat('1', 'Anna'), chat('2', 'Ben', { is_archived: true, unread_count: 4 }), chat('3', 'Cleo', { is_archived: true })]);
    expect(screen.getAllByTestId('chat-list-item').map((row) => row.dataset.chatName)).toEqual(['Anna']);
    const row = screen.getByTestId('archived-chats-row');
    expect(within(row).getByText('Ben, Cleo')).toBeInTheDocument();
    expect(within(row).getByText('4')).toBeInTheDocument();

    fireEvent.click(row);
    expect(screen.getAllByTestId('chat-list-item').map((item) => item.dataset.chatName)).toEqual(['Ben', 'Cleo']);
    fireEvent.click(screen.getByTestId('archived-chats-back'));
    expect(screen.getAllByTestId('chat-list-item').map((item) => item.dataset.chatName)).toEqual(['Anna']);
  });

  it('shows no Archived row without archived chats and names the Saved Messages chat', () => {
    renderBody([chat('1', 'me', { is_saved: true })]);
    expect(screen.queryByTestId('archived-chats-row')).not.toBeInTheDocument();
    expect(screen.getByText(en.chatOrganizer.savedMessages)).toBeInTheDocument();
    expect(screen.getByTestId('saved-messages-avatar')).toBeInTheDocument();
  });

  it('archives a chat when its row is swiped left', () => {
    const onToggleArchived = vi.fn();
    renderBody([chat('1', 'Anna')], onToggleArchived);
    const row = screen.getByTestId('chat-list-item');
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 10 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 280, clientY: 10 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 150, clientY: 10 }] });
    fireEvent.touchEnd(row);
    expect(onToggleArchived).toHaveBeenCalledWith('1');
  });
});
