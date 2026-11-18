import { fireEvent, render, screen } from '@testing-library/react';
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

const body = (chats: Chat[], onChatClick = vi.fn()) => (
  <ChatListBody
    chats={chats} translations={en} getLastMessagePreview={() => ''} getLastMessageTime={() => ''}
    isOwnLastMessage={() => false} isOwnLastMessageRead={() => false} onStartChat={vi.fn()} onChatClick={onChatClick}
    onChatContextMenu={vi.fn()} onToggleArchived={vi.fn()} onReorderPinned={vi.fn()}
  />
);

const names = () => screen.getAllByTestId('chat-list-item').map((row) => row.dataset.chatName);

describe('ChatListBody Requests folder', () => {
  it('keeps request chats out of the main list behind a Requests row with their number', () => {
    const onChatClick = vi.fn();
    render(body([
      chat('1', 'Anna'),
      chat('2', 'Stranger', { is_request: true, unread_count: 2 }),
      chat('3', 'Spammer', { is_request: true }),
      chat('4', 'Old', { is_archived: true }),
    ], onChatClick));
    expect(names()).toEqual(['Anna']);
    const row = screen.getByTestId('requests-row');
    expect(row).toHaveTextContent(`${en.chatOrganizer.requests} (2)`);
    expect(screen.getByTestId('requests-count')).toHaveTextContent('2');

    fireEvent.click(row);
    expect(names()).toEqual(['Stranger', 'Spammer']);
    expect(screen.queryByTestId('requests-row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('archived-chats-row')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('chat-list-item')[0]);
    expect(onChatClick).toHaveBeenCalledWith(expect.objectContaining({ id: '2', is_request: true }));

    fireEvent.click(screen.getByTestId('requests-back'));
    expect(names()).toEqual(['Anna']);
  });

  it('shows no Requests row without requests', () => {
    render(body([chat('1', 'Anna'), chat('2', 'Ben')]));
    expect(screen.queryByTestId('requests-row')).not.toBeInTheDocument();
  });

  it('updates the badge when a chat_list_update moves a request out and leaves the emptied folder', () => {
    const view = render(body([chat('1', 'Anna'), chat('2', 'Stranger', { is_request: true }), chat('3', 'Spammer', { is_request: true })]));
    fireEvent.click(screen.getByTestId('requests-row'));
    view.rerender(body([chat('1', 'Anna'), chat('2', 'Stranger'), chat('3', 'Spammer', { is_request: true })]));
    expect(names()).toEqual(['Spammer']);
    view.rerender(body([chat('1', 'Anna'), chat('2', 'Stranger'), chat('3', 'Spammer')]));
    expect(screen.queryByTestId('requests-back')).not.toBeInTheDocument();
    expect(names()).toEqual(['Anna', 'Stranger', 'Spammer']);
    view.rerender(body([chat('1', 'Anna'), chat('2', 'Stranger'), chat('3', 'Spammer'), chat('5', 'New', { is_request: true })]));
    expect(screen.getByTestId('requests-count')).toHaveTextContent('1');
  });
});
