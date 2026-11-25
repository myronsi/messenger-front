import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { AddImportMessagesRequest, ChatImport } from '../api/importTypes';
import { ImportChatDialog } from './ImportChatDialog';

const calls = vi.hoisted(() => ({ createGroup: vi.fn(), start: vi.fn(), get: vi.fn(), addMessages: vi.fn(), finish: vi.fn(), remove: vi.fn() }));

vi.mock('../api/importApi', () => ({ importCalls: calls }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/entities/chat', () => ({
  useGetOneOnOneChatsQuery: () => ({ data: undefined }),
  useGetGroupChatsQuery: () => ({ data: undefined }),
  useGetGroupDetailsQuery: () => ({ data: undefined }),
}));

const at = '2021-03-04T14:08:00.000Z';
const running: ChatImport = {
  id: '9', chat_id: '7', source: 'whatsapp', state: 'running', message_count: 3, file_count: 0, created_at: at, finished_at: null,
  first_at: at, last_at: at, next_index: 0, imported_by: '1', senders: [],
};
const content = ['04/03/2021, 14:08 - Anna: Hi Bob', '05/03/2021, 09:00 - Bob K.: Hi Anna', '05/03/2021, 09:01 - Bob K.: See you'].join('\n');
const me = { id: '1', username: 'anna', displayName: 'Anna' };
const chat = { chatId: '7', name: 'Bob K.', isGroup: false, peer: { id: '2', username: 'bobk', displayName: 'Bob K.' } };

beforeEach(() => {
  localStorage.clear();
  Object.values(calls).forEach((call) => call.mockReset());
  calls.start.mockResolvedValue({ data: running });
  calls.addMessages.mockImplementation(async (_id: string, body: AddImportMessagesRequest) => (
    { data: { next_index: body.from_index + body.messages.length } }
  ));
  calls.finish.mockResolvedValue({ data: { ...running, state: 'done' } });
});

describe('ImportChatDialog with a WhatsApp export', () => {
  it('lets the user switch day and month when the export does not show the order', async () => {
    render(<ImportChatDialog open onOpenChange={vi.fn()} me={me} chat={chat} />);
    fireEvent.change(screen.getByTestId('import-file-input'), { target: { files: [new File([content], 'WhatsApp Chat with Bob K.txt')] } });
    expect(await screen.findByText(en.chatImport.preview.dateOrderUnsure)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: en.chatImport.preview.dayFirst }));
    expect(await screen.findByRole('radio', { name: en.chatImport.preview.dayFirst })).toBeChecked();
    expect(screen.getByTestId('import-summary')).toHaveTextContent(/4 Mar 2021 – 5 Mar 2021/);

    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.next }));
    expect(screen.getByRole('combobox', { name: 'Anna' })).toHaveValue('me');
    expect(screen.getByRole('combobox', { name: 'Bob K.' })).toHaveValue('2');
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.start }));

    expect(await screen.findByText('3 messages imported.')).toBeInTheDocument();
    expect(calls.start).toHaveBeenCalledWith('7', expect.objectContaining({
      source: 'whatsapp', first_at: new Date(2021, 2, 4, 14, 8).toISOString(),
      senders: [{ key: 's-2', name: 'Bob K.', message_count: 2, user_id: '2' }, { key: 's-1', name: 'Anna', message_count: 1, me: true }],
    }));
  });
});
