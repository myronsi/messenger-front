import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

  it('stays on the main list when a chat is archived after the archive was emptied', () => {
    const view = renderBody([chat('1', 'Anna'), chat('2', 'Ben', { is_archived: true })]);
    fireEvent.click(screen.getByTestId('archived-chats-row'));
    const rerenderWith = (chats: Chat[]) => view.rerender(
      <ChatListBody
        chats={chats} translations={en} getLastMessagePreview={() => ''} getLastMessageTime={() => ''}
        isOwnLastMessage={() => false} isOwnLastMessageRead={() => false} onStartChat={vi.fn()} onChatClick={vi.fn()}
        onChatContextMenu={vi.fn()} onToggleArchived={vi.fn()} onReorderPinned={vi.fn()}
      />,
    );
    rerenderWith([chat('1', 'Anna'), chat('2', 'Ben')]);
    rerenderWith([chat('1', 'Anna', { is_archived: true }), chat('2', 'Ben')]);
    expect(screen.queryByTestId('archived-chats-back')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('chat-list-item').map((item) => item.dataset.chatName)).toEqual(['Ben']);
  });

  it('shows no Archived row without archived chats and names the chat with yourself after you', () => {
    renderBody([chat('1', 'me', { is_saved: true, display_name: 'Mia Stone' })]);
    expect(screen.queryByTestId('archived-chats-row')).not.toBeInTheDocument();
    expect(screen.getByText('Mia Stone (you)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mia Stone' })).toBeInTheDocument();
  });

  it('slides a swiped row out before archiving the chat', () => {
    vi.useFakeTimers();
    const onToggleArchived = vi.fn();
    renderBody([chat('1', 'Anna')], onToggleArchived);
    const row = screen.getByTestId('chat-list-item');
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 10 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 280, clientY: 10 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 100, clientY: 10 }] });
    const surface = screen.getByTestId('chat-swipe-surface');
    expect(surface.style.transform).toBe('translateX(-200px)');
    expect(screen.getByTestId('chat-swipe-action')).toHaveAttribute('data-armed', 'true');
    fireEvent.touchEnd(row);
    expect(surface.parentElement).toHaveAttribute('data-leaving', 'true');
    expect(surface.style.transform).toBe(`translateX(-${window.innerWidth + 24}px)`);
    act(() => { vi.advanceTimersByTime(300); });
    expect(onToggleArchived).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onToggleArchived).toHaveBeenCalledWith('1');
    vi.useRealTimers();
  });

  it('springs a short swipe back without archiving', () => {
    vi.useFakeTimers();
    const onToggleArchived = vi.fn();
    renderBody([chat('1', 'Anna')], onToggleArchived);
    const row = screen.getByTestId('chat-list-item');
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 10 }], timeStamp: 0 });
    fireEvent.touchMove(row, { touches: [{ clientX: 280, clientY: 10 }], timeStamp: 100 });
    fireEvent.touchMove(row, { touches: [{ clientX: 260, clientY: 10 }], timeStamp: 400 });
    expect(screen.getByTestId('chat-swipe-action')).not.toHaveAttribute('data-armed');
    fireEvent.touchEnd(row);
    const surface = screen.getByTestId('chat-swipe-surface');
    expect(surface.parentElement).not.toHaveAttribute('data-leaving');
    expect(surface.style.transform).toBe('');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onToggleArchived).not.toHaveBeenCalled();
    expect(screen.queryByTestId('chat-swipe-action')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
