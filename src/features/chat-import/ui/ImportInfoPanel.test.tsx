import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { ChatImport } from '../api/importTypes';
import { ImportInfoPanel } from './ImportInfoPanel';

const state = vi.hoisted(() => ({ imports: [] as unknown[], assign: vi.fn(), remove: vi.fn() }));

vi.mock('../api/importApi', () => ({
  useGetChatImportsQuery: () => ({ data: state.imports, isLoading: false }),
  useAssignImportSenderMutation: () => [state.assign],
  useRemoveImportMutation: () => [state.remove, { isLoading: false }],
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/entities/chat', () => ({
  useGetGroupDetailsQuery: () => ({ data: { participants: [
    { id: '1', username: 'anna', display_name: 'Anna' }, { id: '2', username: 'bobk', display_name: 'Bob Kramer' },
    { id: '3', username: 'carla', display_name: 'Carla' },
  ] } }),
}));

const chatImport: ChatImport = {
  id: '9', chat_id: '7', source: 'telegram', state: 'done', message_count: 120, file_count: 0, created_at: '2026-11-25T10:00:00Z', finished_at: null, first_at: '2019-03-12T14:05:00Z', last_at: '2020-01-02T10:00:00Z',
  next_index: 120, imported_by: '1',
  senders: [
    { key: 'user1', name: 'Anna', message_count: 60, state: 'me', user_id: '1' },
    { key: 'user2', name: 'Bob', message_count: 40, state: 'pending', user_id: '2' },
    { key: 'user3', name: 'Dan', message_count: 20, state: 'unassigned', user_id: null },
  ],
};

const show = (meId = '1', canRemoveAll = false) => render(
  <ImportInfoPanel open onOpenChange={vi.fn()} chatId="7" isGroup me={{ id: meId, username: 'x' }} canRemoveAll={canRemoveAll} />,
);

beforeEach(() => {
  state.imports = [chatImport];
  state.assign.mockReset().mockResolvedValue({ data: {} });
  state.remove.mockReset().mockResolvedValue({ data: null });
});

describe('ImportInfoPanel', () => {
  it('lists the import, its importer and the state of every sender', () => {
    show();
    const panel = screen.getByTestId('import-info-panel');
    expect(panel).toHaveTextContent('120 messages from Telegram, Mar 2019 – Jan 2020');
    expect(panel).toHaveTextContent('Imported by Anna');
    const rows = screen.getAllByTestId('import-info-sender');
    expect(rows.map((row) => row.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Importer'), expect.stringContaining('Waiting for confirmation · Bob Kramer'), expect.stringContaining('Not assigned'),
    ]));
  });

  it('lets the importer assign a name later', () => {
    show();
    fireEvent.change(screen.getByRole('combobox', { name: `${en.chatImport.info.assign}: Dan` }), { target: { value: '3' } });
    expect(state.assign).toHaveBeenCalledWith({ importId: '9', chatId: '7', key: 'user3', userId: '3' });
  });

  it('removes the imported history after a confirmation', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.info.remove }));
    expect((await screen.findAllByText(en.chatImport.info.removeTitle)).length).toBeGreaterThan(0);
    const buttons = screen.getAllByRole('button', { name: en.chatImport.info.remove });
    fireEvent.click(buttons[buttons.length - 1]);
    await vi.waitFor(() => expect(state.remove).toHaveBeenCalledWith({ importId: '9', chatId: '7' }));
  });

  it('shows no controls to other members, but lets the group owner remove', () => {
    show('3');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.chatImport.info.remove })).not.toBeInTheDocument();
    const owner = show('3', true);
    expect(within(owner.container.ownerDocument.body).getAllByRole('button', { name: en.chatImport.info.remove }).length).toBeGreaterThan(0);
  });

  it('says when the chat has no imported history', () => {
    state.imports = [];
    show();
    expect(screen.getByText(en.chatImport.info.empty)).toBeInTheDocument();
  });
});
