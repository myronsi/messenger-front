import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import SelectionBar from './SelectionBar';

const api = vi.hoisted(() => ({ deleteMessages: vi.fn(), notify: vi.fn(), copyText: vi.fn(), toast: vi.fn() }));

vi.mock('@/entities/message', () => ({
  useDeleteMessagesMutation: () => [api.deleteMessages, { isLoading: false }],
  notifyMessageDeletedLocally: api.notify,
}));
vi.mock('@/shared/lib/copyText', () => ({ copyText: api.copyText }));
vi.mock('@/shared/ui/sonner', () => ({ toast: api.toast }));
vi.mock('./ForwardMessageDialog', () => ({
  default: ({ open, bulk }: { open: boolean; bulk?: { messageIds: string[] } | null }) => (open ? <div data-testid="forward">{bulk?.messageIds.join(',')}</div> : null),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    translations: {
      selectedMessages: '{count} selected', forward: 'Forward', deleteMessage: 'Delete', cancelSelection: 'Cancel selection',
      deleteMessagesConfirm: 'Delete {count} messages?', deleteForMe: 'Delete for me',
      deleteForEveryone: 'Delete for everyone', cancel: 'Cancel', failedToDeleteMessages: 'Failed',
      copy: 'Copy', selectAll: 'Select all', messagesCopied: 'Copied', copyLinkFailed: 'Copy failed',
    },
  }),
}));

const message = (id: string, mine = true): Message => ({
  id, sender: mine ? 'me' : 'ann', is_own: mine, content: 'hi', timestamp: '2026-11-03T10:00:00Z', type: 'message', read_by: [],
});

const renderBar = (ids: EntityId[], messages: Message[], onClear = vi.fn(), onSelectAll?: () => void) => {
  render(<SelectionBar chatId="5" messages={messages} selection={{ ids: new Set(ids), active: true, closing: false, toggle: vi.fn(), start: vi.fn() }} username="me"
    canDeleteForEveryone={(m) => !!m.is_own} onClear={onClear} onSelectAll={onSelectAll} />);
  return onClear;
};

beforeEach(() => {
  api.deleteMessages.mockReset().mockReturnValue({ unwrap: () => Promise.resolve() });
  api.notify.mockReset();
  api.copyText.mockReset().mockResolvedValue(true);
  api.toast.mockReset();
});

describe('SelectionBar', () => {
  it('forwards the selected messages', () => {
    renderBar(['1', '2'], [message('1'), message('2'), message('3')]);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.getByTestId('forward')).toHaveTextContent('1,2');
  });

  it('offers forwarding only up to 20 messages', () => {
    const many = Array.from({ length: 21 }, (_, i) => message(String(i + 1)));
    renderBar(many.slice(0, 20).map((m) => m.id), many);
    expect(screen.getByRole('button', { name: 'Forward' })).toBeInTheDocument();
    cleanup();
    renderBar(many.map((m) => m.id), many);
    expect(screen.queryByRole('button', { name: 'Forward' })).not.toBeInTheDocument();
  });

  it('deletes for everyone only when every message may be deleted so', async () => {
    const onClear = renderBar(['1', '2'], [message('1'), message('2', false)]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('button', { name: 'Delete for everyone' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete for me' }));
    await waitFor(() => expect(onClear).toHaveBeenCalled());
    expect(api.deleteMessages).toHaveBeenCalledWith({ chatId: '5', messageIds: ['1', '2'], scope: 'me' });
    expect(api.notify).toHaveBeenCalledTimes(2);
  });

  it('keeps the selection and says so when deleting fails', async () => {
    api.deleteMessages.mockReturnValue({ unwrap: () => Promise.reject(new Error('nope')) });
    const onClear = renderBar(['1'], [message('1')]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete for everyone' }));
    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(onClear).not.toHaveBeenCalled();
  });

  it('ends the selection with Escape', () => {
    const onClear = renderBar(['1'], [message('1')]);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClear).toHaveBeenCalled();
  });
});

describe('SelectionBar actions', () => {
  it('hides Forward when a selected message is a system message', () => {
    renderBar(['1', '2'], [message('1'), { ...message('2'), is_system: true }]);
    expect(screen.queryByRole('button', { name: 'Forward' })).not.toBeInTheDocument();
    cleanup();
    renderBar(['1'], [message('1')]);
    expect(screen.getByRole('button', { name: 'Forward' })).toHaveAttribute('aria-label', 'Forward');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('aria-label', 'Delete');
  });
});

describe('SelectionBar after the selection closes', () => {
  it('does not reopen an old dialog for the next selection', () => {
    const bar = (active: boolean) => (
      <SelectionBar chatId="5" messages={[message('1'), message('2')]} username="me" canDeleteForEveryone={(m) => !!m.is_own} onClear={vi.fn()}
        selection={{ ids: new Set<EntityId>(active ? ['1'] : []), active, closing: false, toggle: vi.fn(), start: vi.fn() }} />
    );
    const view = render(bar(true));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete 1 messages?')).toBeInTheDocument();
    view.rerender(bar(false));
    view.rerender(bar(true));
    expect(screen.queryByText('Delete 1 messages?')).not.toBeInTheDocument();
  });
});

describe('SelectionBar copy and select all', () => {
  const chat = [
    { ...message('1'), content: 'first' },
    { ...message('2'), content: 'sticker', sticker: { emoji: 'x' } },
    { ...message('3'), type: 'file' as const, content: { file_url: '/f', caption: ' photo caption ' } },
    { ...message('4'), content: 'last' },
  ] as Message[];

  it('copies only the texts in chat order with a blank line between them', async () => {
    const onClear = renderBar(['4', '3', '2', '1'], chat);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(onClear).toHaveBeenCalled());
    expect(api.copyText).toHaveBeenCalledWith('first\n\nphoto caption\n\nlast');
    expect(api.toast).toHaveBeenCalledWith('Copied');
  });

  it('hides Copy when no selected message has text', () => {
    renderBar(['2'], chat);
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('keeps the selection when copying fails', async () => {
    api.copyText.mockResolvedValue(false);
    const onClear = renderBar(['1'], chat);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(api.toast).toHaveBeenCalledWith('Copy failed'));
    expect(onClear).not.toHaveBeenCalled();
  });

  it('selects all with the button and Ctrl+A, and copies with Ctrl+C', async () => {
    const onSelectAll = vi.fn();
    renderBar(['1'], chat, vi.fn(), onSelectAll);
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    expect(onSelectAll).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(window, { key: 'c', metaKey: true });
    await waitFor(() => expect(api.copyText).toHaveBeenCalledWith('first'));
  });

  it('leaves Ctrl+A and Ctrl+C to text fields', () => {
    const onSelectAll = vi.fn();
    renderBar(['1'], chat, vi.fn(), onSelectAll);
    const input = document.createElement('textarea');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'c', ctrlKey: true });
    expect(onSelectAll).not.toHaveBeenCalled();
    expect(api.copyText).not.toHaveBeenCalled();
    input.remove();
  });

  it('hides Select all when everything is already selected', () => {
    renderBar(['1', '2', '3', '4'], chat, vi.fn(), vi.fn());
    expect(screen.queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();
  });
});
