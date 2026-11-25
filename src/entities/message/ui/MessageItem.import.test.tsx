import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message } from '../model/types';
import MessageItem from './MessageItem';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/contexts/fileTypesConfig', () => ({ useFileTypes: () => ({ getFileTypeConfig: () => undefined }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));

const imported = (state: NonNullable<Message['import']>['sender_state'], fields: Partial<Message> = {}): Message => ({
  id: '5', sender: 'System', content: 'Hello from 2019', timestamp: '2019-03-12T14:05:00Z', type: 'message', read_by: [],
  import: { import_id: '9', source: 'whatsapp', original_at: '2019-03-12T14:05:00Z', sender_name: 'Bob K.', sender_state: state }, ...fields,
});

const show = (message: Message, isGroup = false) => render(
  <MessageItem
    message={message} prevMessage={null} nextMessage={null} replyMessage={undefined} userId="1" isGroup={isGroup} isImage={false} isMobile={false}
    showNewMessagesMarker={false} nextShowsNewMessagesMarker={false} translations={en} interlocutorDeleted={false} isHighlighted={false}
    isContextHighlighted={false} messageRefs={{ current: {} }} firstUnreadMarkerRef={{ current: null }} getFormattedDateLabel={() => '12 Mar 2019'}
    getMessageTime={() => '14:05'} isOwnMessage={(item) => item.sender_id === '1'} getFileTypeConfig={() => undefined}
    renderMessageContent={(item) => item.content as string} onPlayAudio={vi.fn()} onMessageClick={vi.fn()}
    onClick={vi.fn()} onAvatarClick={vi.fn()} onReplyClick={vi.fn()} setTempHighlightedMessageId={vi.fn()} wsRef={{ current: null }}
  />,
);

describe('MessageItem with imported messages', () => {
  it('shows an unconfirmed sender name as grey text without an avatar, also in direct chats', () => {
    show(imported('unconfirmed'));
    expect(screen.getByTestId('imported-sender')).toHaveTextContent('Bob K.');
    expect(screen.getByTestId('imported-sender')).toHaveClass('text-muted-foreground');
    expect(screen.queryByRole('button', { name: 'Bob K.' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps the avatar space but no avatar for an unconfirmed sender in a group', () => {
    show(imported('unconfirmed'), true);
    expect(screen.getByTestId('imported-sender')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a confirmed sender like a normal member', () => {
    show(imported('confirmed', { sender: 'Bob Kramer', sender_id: '2', sender_username: 'bob', avatar_url: '/bob.png' }), true);
    expect(screen.queryByTestId('imported-sender')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Bob Kramer' })).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Bob Kramer' })).toBeInTheDocument();
  });

  it('tells where and when an imported message was sent', () => {
    show(imported('me', { sender_id: '1' }));
    const mark = screen.getAllByTestId('imported-mark')[0];
    expect(mark.title).toMatch(/^Imported from WhatsApp, sent /);
    expect(mark.title).toContain('2019');
  });

  it('marks nothing on normal messages', () => {
    show({ ...imported('me'), import: null });
    expect(screen.queryByTestId('imported-mark')).not.toBeInTheDocument();
    expect(screen.queryByTestId('imported-sender')).not.toBeInTheDocument();
  });
});
