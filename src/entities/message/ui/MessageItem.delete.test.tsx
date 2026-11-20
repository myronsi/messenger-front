import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message } from '../model/types';
import MessageItem from './MessageItem';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/contexts/fileTypesConfig', () => ({ useFileTypes: () => ({ getFileTypeConfig: () => undefined }) }));

const message: Message = {
  id: '5', sender: 'me', sender_id: '1', content: 'Oops, wrong chat', timestamp: '2026-11-20T13:00:00Z', type: 'message', read_by: [], is_deleting: true,
};

const renderDeleting = () => render(
  <MessageItem
    message={message} prevMessage={null} nextMessage={null} replyMessage={undefined} userId="1" isGroup={false} isImage={false} isMobile={false}
    showNewMessagesMarker={false} nextShowsNewMessagesMarker={false} translations={en} interlocutorDeleted={false} isHighlighted={false}
    isContextHighlighted={false} messageRefs={{ current: {} }} firstUnreadMarkerRef={{ current: null }} getFormattedDateLabel={() => 'Today'}
    getMessageTime={() => '13:00'} isOwnMessage={(item) => item.sender_id === '1'} getFileTypeConfig={() => undefined}
    renderMessageContent={(item) => item.content as string} onPlayAudio={vi.fn()} onMessageClick={vi.fn()}
    onClick={vi.fn()} onAvatarClick={vi.fn()} onReplyClick={vi.fn()} setTempHighlightedMessageId={vi.fn()} wsRef={{ current: null }}
  />,
);

const reduceMotion = (reduce: boolean) => vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
  matches: reduce && query.includes('reduce'), media: query, onchange: null,
  addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
}));

describe('MessageItem delete animation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('pops the bubble and bursts a ring right next to it', () => {
    reduceMotion(false);
    renderDeleting();
    const ring = screen.getByTestId('message-pop-ring');
    const bubble = ring.previousElementSibling as HTMLElement;
    expect(bubble).toHaveClass('message-pop');
    expect(bubble).toHaveTextContent('Oops, wrong chat');
    expect(ring).toHaveClass('text-primary');
  });

  it('drops the entry animation so the row collapse is the one that runs', () => {
    reduceMotion(false);
    const { container } = renderDeleting();
    const row = container.querySelector('[data-message-id="5"]');
    expect(row).toHaveClass('message-deleting');
    expect(row).not.toHaveClass('motion-message');
    expect(row).not.toHaveClass('motion-message-send');
    expect((row as HTMLElement).style.getPropertyValue('--msg-h')).toBe('0px');
  });

  it('shows no ring when the system asks for less motion', () => {
    reduceMotion(true);
    renderDeleting();
    expect(screen.queryByTestId('message-pop-ring')).not.toBeInTheDocument();
  });
});
