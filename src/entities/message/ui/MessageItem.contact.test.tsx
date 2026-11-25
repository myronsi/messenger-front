import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message } from '../model/types';
import type { MessageContact } from '../model/richTypes';
import MessageItem from './MessageItem';

const links = vi.hoisted(() => ({ navigate: vi.fn(), open: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/contexts/fileTypesConfig', () => ({ useFileTypes: () => ({ getFileTypeConfig: () => undefined }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: ({ alt }: { alt?: string }) => <img alt={alt} /> }));
vi.mock('@/shared/auth/tokenClaims', async (original) => ({ ...(await original<object>()), getTokenSubject: () => '1' }));
vi.mock('@/shared/lib/ownLink', () => ({ navigateInApp: links.navigate, openOwnLink: links.open }));

const message = (contact: MessageContact): Message => ({
  id: '31', sender: 'Anna', sender_id: '2', content: '👤 @ben', timestamp: '2026-11-25T10:00:00Z', type: 'message', read_by: [], contact,
});

const item = (value: Message) => (
  <MessageItem
    message={value} prevMessage={null} nextMessage={null} userId="1" isGroup={false} isImage={false} isMobile={false}
    showNewMessagesMarker={false} nextShowsNewMessagesMarker={false} translations={en} interlocutorDeleted={false} isHighlighted={false}
    isContextHighlighted={false} messageRefs={{ current: {} }} firstUnreadMarkerRef={{ current: null }} getFormattedDateLabel={() => 'Today'}
    getMessageTime={() => '10:00'} isOwnMessage={(entry) => entry.sender_id === '1'} getFileTypeConfig={() => undefined}
    renderMessageContent={(entry) => entry.content as string} onPlayAudio={vi.fn()} onMessageClick={vi.fn()}
    onClick={vi.fn()} onAvatarClick={vi.fn()} onReplyClick={vi.fn()} setTempHighlightedMessageId={vi.fn()} wsRef={{ current: null }}
  />
);

beforeEach(() => { links.navigate.mockReset(); links.open.mockReset(); });

describe('MessageItem contact', () => {
  it('shows the shared person with Message and View profile', () => {
    render(item(message({ user_id: '3', user: { id: '3', username: 'ben', display_name: 'Ben' } })));
    expect(screen.getByTestId('contact-message')).toHaveTextContent('Ben');
    expect(screen.getByTestId('contact-message')).toHaveTextContent('@ben');
    fireEvent.click(screen.getByRole('button', { name: 'Message' }));
    expect(links.navigate).toHaveBeenCalledWith('/dm/@ben');
    fireEvent.click(screen.getByRole('button', { name: 'View profile' }));
    expect(links.open).toHaveBeenCalledWith('/@ben');
  });

  it('says This is you on my own card instead of offering a message', () => {
    render(item(message({ user_id: '1', user: { id: '1', username: 'me', display_name: 'Me' } })));
    expect(screen.getByText('This is you')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Message' })).not.toBeInTheDocument();
  });

  it('shows a plain line when the account is gone or hidden', () => {
    render(item(message({ user_id: '3', user: null })));
    expect(screen.getByTestId('contact-message')).toHaveTextContent('This account is no longer available');
    expect(screen.queryByRole('button', { name: 'View profile' })).not.toBeInTheDocument();
  });
});
