import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerEvent } from '@myronsi/messenger-api';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { applyTypingFrame, clearTypingUsers } from '@/entities/typing';
import { en } from '@/shared/lang/en';
import type { Chat } from '@/entities/message';
import ChatListItem from './ChatListItem';

let snapshot = { preferences: { enabled: true, sound: true, previews: false }, mutes: [] as { chat_id: string; until: string }[] };
vi.mock('@/shared/lib/notifications/api', () => ({
  subscribeNotifications: () => () => undefined,
  notificationSnapshot: () => snapshot,
  muteNotifications: vi.fn(),
}));
vi.mock('@/entities/user', () => ({ useGetUserByIdQuery: (id: unknown) => ({ data: id === '5' ? { display_name: 'Anna' } : undefined }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));

const chat = { id: '7', name: 'alice', display_name: 'Alice', type: 'one-on-one', unread_count: 3 } as Chat;
const renderItem = (isContextSelected = false) => render(
  <ChatListItem
    chat={chat} activeChatId="7" isContextSelected={isContextSelected} translations={en} getLastMessagePreview={() => ''} getLastMessageTime={() => ''}
    isOwnLastMessage={() => false} isOwnLastMessageRead={() => false} onClick={vi.fn()} onContextMenu={vi.fn()}
  />,
);

describe('ChatListItem', () => {
  beforeEach(() => { snapshot = { ...snapshot, mutes: [] }; });

  it('uses a gray context selection instead of the active chat color', () => {
    renderItem(true);
    const row = screen.getByTestId('chat-list-item');
    expect(row).toHaveClass('bg-muted', 'text-foreground');
    expect(row).not.toHaveClass('md:bg-primary');
    expect(row).toHaveAttribute('data-context-selected', 'true');
  });

  it('shows the unread count in the accent colour for a normal chat', () => {
    renderItem();
    expect(screen.queryByTestId('chat-muted-icon')).not.toBeInTheDocument();
    expect(screen.getByText('3')).toHaveClass('bg-primary');
  });

  it('marks a muted chat with an icon and a grey unread count', () => {
    snapshot = { ...snapshot, mutes: [{ chat_id: '7', until: '9999-01-01T00:00:00Z' }] };
    renderItem();
    expect(screen.getByTestId('chat-muted-icon')).toBeInTheDocument();
    expect(screen.getByText('3')).toHaveClass('bg-muted-foreground');
    expect(screen.getByText('3')).not.toHaveClass('bg-primary');
  });
});

describe('ChatListItem layout', () => {
  const base = { getLastMessagePreview: () => 'Hello there', getLastMessageTime: () => '09:30', onClick: vi.fn(), onContextMenu: vi.fn(), translations: en };
  const message = { id: '1', sender_id: '5', sender_name: 'Anna', content: 'Hello there', type: 'message' as const, timestamp: 't' };

  it('names the sender in groups and shows a group icon instead of a text label', () => {
    render(<ChatListItem {...base} chat={{ id: '9', name: 'team', display_name: 'Team', type: 'group', last_message: message } as Chat}
      isOwnLastMessage={() => false} isOwnLastMessageRead={() => false} />);
    expect(screen.getByText('Anna:', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText(en.group)).toBeInTheDocument();
    expect(screen.queryByText(`(${en.group})`)).not.toBeInTheDocument();
  });

  it('shows the presence dot only for online contacts and no sender prefix in direct chats', () => {
    const { rerender } = render(<ChatListItem {...base} chat={{ ...chat, unread_count: 0, is_online: false, last_message: message }}
      isOwnLastMessage={() => false} isOwnLastMessageRead={() => false} />);
    expect(screen.queryByTestId('chat-online-dot')).not.toBeInTheDocument();
    expect(screen.queryByText('Anna:', { exact: false })).not.toBeInTheDocument();
    rerender(<ChatListItem {...base} chat={{ ...chat, unread_count: 0, is_online: true, is_pinned: true, last_message: message }}
      isOwnLastMessage={() => false} isOwnLastMessageRead={() => false} />);
    expect(screen.getByTestId('chat-online-dot')).toBeInTheDocument();
    expect(screen.getByLabelText(en.pinned)).toBeInTheDocument();
  });
});

describe('ChatListItem typing status', () => {
  const base = { getLastMessagePreview: () => 'Hello there', getLastMessageTime: () => '09:30', onClick: vi.fn(), onContextMenu: vi.fn(), translations: en,
    isOwnLastMessage: () => false, isOwnLastMessageRead: () => false };
  const typing = (chatId: string, isTyping = true) => ({
    type: 'typing', event_id: '1', chat_id: chatId, data: { user_id: '5', is_typing: isTyping, action: 'typing' },
  }) as ServerEvent;

  it('replaces the preview with the typing status and brings it back', () => {
    localStorage.setItem('language', 'en');
    render(<LanguageProvider><ChatListItem {...base} chat={{ id: '9', name: 'team', display_name: 'Team', type: 'group' } as Chat} /></LanguageProvider>);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    act(() => applyTypingFrame(typing('9')));
    expect(screen.getByTestId('typing-label')).toHaveTextContent('Anna is typing…');
    expect(screen.getByTestId('typing-label')).toHaveClass('text-primary');
    expect(screen.queryByText('Hello there')).not.toBeInTheDocument();
    act(() => applyTypingFrame(typing('9', false)));
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    act(() => clearTypingUsers());
  });
});
