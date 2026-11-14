import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message } from '../model/types';
import MessageItem from './MessageItem';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/contexts/fileTypesConfig', () => ({ useFileTypes: () => ({ getFileTypeConfig: () => undefined }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: ({ onError }: { onError?: () => void }) => <img alt="" data-testid="sticker-img" onError={onError} /> }));

const quoted: Message = { id: '1', sender: 'bob', sender_id: '2', content: 'https://staging.messenger.viserix.com/stickers/4IMGYFML3TIU', timestamp: '2026-11-10T19:00:00Z', type: 'message', read_by: [] };
const sticker = (senderId: string): Message => ({
  id: '2', sender: senderId === '1' ? 'me' : 'bob', sender_id: senderId, content: '🐱', timestamp: '2026-11-10T19:19:00Z', type: 'message', read_by: [],
  reply_to: '1', sticker: { emoji: '🐱', image_url: '/api/v2/attachments/s/content' },
});

const item = (message: Message) => (
  <MessageItem
    message={message} prevMessage={null} nextMessage={null} replyMessage={quoted} userId="1" isGroup={false} isImage={false} isMobile={false}
    showNewMessagesMarker={false} nextShowsNewMessagesMarker={false} translations={en} interlocutorDeleted={false} isHighlighted={false}
    isContextHighlighted={false} messageRefs={{ current: {} }} firstUnreadMarkerRef={{ current: null }} getFormattedDateLabel={() => 'Today'}
    getMessageTime={() => '19:19'} isOwnMessage={(message) => message.sender_id === '1'} getFileTypeConfig={() => undefined}
    renderMessageContent={(message) => message.content as string} onPlayAudio={vi.fn()} onMessageClick={vi.fn()}
    onClick={vi.fn()} onAvatarClick={vi.fn()} onReplyClick={vi.fn()} setTempHighlightedMessageId={vi.fn()} wsRef={{ current: null }}
  />
);

const renderSticker = (senderId: string) => render(item(sticker(senderId)));

const stickerBox = () => screen.getByTestId('sticker-message').closest('.relative') as HTMLElement;

describe('MessageItem sticker replies', () => {
  it('keeps an own sticker on the right under a wide reply quote', () => {
    renderSticker('1');
    expect(stickerBox()).toHaveClass('w-fit', 'ml-auto');
  });

  it('keeps another person’s sticker on the left under a wide reply quote', () => {
    renderSticker('2');
    expect(stickerBox()).toHaveClass('w-fit', 'mr-auto');
    expect(stickerBox()).not.toHaveClass('ml-auto');
  });

  it('shows the sticker again when the saved message brings a new picture after the first one failed', () => {
    const { rerender } = renderSticker('1');
    fireEvent.error(screen.getByTestId('sticker-img'));
    expect(screen.queryByTestId('sticker-message')).not.toBeInTheDocument();
    rerender(item({ ...sticker('1'), sticker: { emoji: '🐱', image_url: '/api/v2/attachments/s2/content' } }));
    expect(screen.getByTestId('sticker-message')).toBeInTheDocument();
  });
});
