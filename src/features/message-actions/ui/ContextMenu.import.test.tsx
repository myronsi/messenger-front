import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message } from '@/entities/message';
import ContextMenu from './ContextMenu';

const requestImportAction = vi.fn();

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/entities/sticker', () => ({ makeStickerFrom: vi.fn() }));
vi.mock('@/entities/message', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/message')>()),
  useDeleteMessageForMeMutation: () => [vi.fn()],
  useGetPinnedMessagesQuery: () => ({ data: { items: [], next_cursor: null, count: 0 } }),
  requestImportAction: (request: unknown) => requestImportAction(request),
}));

const own: Message = { id: '10', sender: 'Me', sender_id: '1', content: 'Hi', timestamp: '2019-03-12T14:05:00Z', type: 'message', read_by: [] };
const withImport = (state: NonNullable<Message['import']>['sender_state']): Message => ({
  ...own, import: { import_id: '9', source: 'telegram', sender_name: 'Me old', sender_state: state },
});

const renderMenu = (message: Message, isMine = true) => render(
  <ContextMenu ref={createRef<HTMLDivElement>()} contextMenu={{ x: 10, y: 10, messageId: message.id, isMine }} messages={[message]} token=""
    chatId="5" userId="1" setContextMenu={vi.fn()} setEditingMessage={vi.fn()} setMessageInput={vi.fn()} setReplyTo={vi.fn()} setModal={vi.fn()}
    wsRef={{ current: null }} isClosing={false} onClose={vi.fn()} reactionMenu={{ message, x: 0, y: 0 }} setReactionMenu={vi.fn()}
    messageInputRef={{ current: null }} onReply={vi.fn()} />,
);

beforeEach(() => requestImportAction.mockClear());

describe('ContextMenu on imported messages', () => {
  it('offers Edit on a normal own message', () => {
    renderMenu(own);
    expect(screen.getByRole('button', { name: en.editMessage })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.chatImport.notMine })).not.toBeInTheDocument();
  });

  it.each(['me', 'confirmed'] as const)('has no Edit on an imported message of state %s', (state) => {
    renderMenu(withImport(state));
    expect(screen.queryByRole('button', { name: en.editMessage })).not.toBeInTheDocument();
  });

  it('offers Not my messages to a confirmed sender and hands the message over', () => {
    const message = withImport('confirmed');
    renderMenu(message);
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.notMine }));
    expect(requestImportAction).toHaveBeenCalledWith({ kind: 'notMine', chatId: '5', message });
  });

  it('does not offer Not my messages to the importer or on messages of others', () => {
    renderMenu(withImport('me'));
    expect(screen.queryByRole('button', { name: en.chatImport.notMine })).not.toBeInTheDocument();
  });
});
