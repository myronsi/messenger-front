import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message, PinnedMessages } from '@/entities/message';
import ContextMenu from './ContextMenu';

const requestPinChange = vi.fn();
const pins: { data: PinnedMessages | undefined; skip: boolean } = { data: undefined, skip: false };

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/entities/sticker', () => ({ makeStickerFrom: vi.fn() }));
vi.mock('@/entities/message', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/message')>()),
  useDeleteMessageForMeMutation: () => [vi.fn()],
  useGetPinnedMessagesQuery: (_chatId: string, options: { skip: boolean }) => {
    pins.skip = options.skip;
    return { data: pins.data };
  },
  requestPinChange: (request: unknown) => requestPinChange(request),
}));

const text: Message = { id: '10', sender: 'Anna', content: 'Meeting at 5', timestamp: '2026-11-21T10:00:00Z', type: 'message', read_by: [] };
const system: Message = { ...text, id: '11', is_system: true, system_event: { kind: 'member_joined', actor_name: 'Anna' } };
const call: Message = { ...text, id: '12', is_system: true, system_event: { kind: 'call', actor_name: 'Anna' } };

const renderMenu = (message: Message, chatId = '5') => render(
  <ContextMenu ref={createRef<HTMLDivElement>()} contextMenu={{ x: 10, y: 10, messageId: message.id, isMine: false }} messages={[message]} token=""
    chatId={chatId} userId="1" setContextMenu={vi.fn()} setEditingMessage={vi.fn()} setMessageInput={vi.fn()} setReplyTo={vi.fn()} setModal={vi.fn()}
    wsRef={{ current: null }} isClosing={false} onClose={vi.fn()} reactionMenu={{ message, x: 0, y: 0 }} setReactionMenu={vi.fn()}
    messageInputRef={{ current: null }} onReply={vi.fn()} />,
);

beforeEach(() => {
  requestPinChange.mockClear();
  pins.data = { items: [], next_cursor: null, count: 0 };
});

describe('ContextMenu pin entry', () => {
  it('offers Pin for a normal message and hands the message over', () => {
    renderMenu(text);
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(requestPinChange).toHaveBeenCalledWith({ chatId: '5', message: text, pin: null });
  });

  it('offers Unpin for a pinned message', () => {
    const pin = { message: text, scope: 'everyone' as const, pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: true };
    pins.data = { items: [pin], next_cursor: null, count: 1 };
    renderMenu(text);
    expect(screen.queryByRole('button', { name: 'Pin' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    expect(requestPinChange).toHaveBeenCalledWith({ chatId: '5', message: text, pin });
  });

  it.each([['system line', system], ['call line', call]])('has no pin entry on a %s', (_, message) => {
    renderMenu(message);
    expect(screen.queryByRole('button', { name: 'Pin' })).not.toBeInTheDocument();
  });

  it('has no pin entry in a chat that is not created yet', () => {
    renderMenu(text, '-3');
    expect(pins.skip).toBe(true);
    expect(screen.queryByRole('button', { name: 'Pin' })).not.toBeInTheDocument();
  });
});
