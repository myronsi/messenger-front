import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { AddImportMessagesRequest, ChatImport } from '../api/importTypes';
import { fileKeyOf } from '../model/resumeStore';
import { ImportChatDialog } from './ImportChatDialog';

const calls = vi.hoisted(() => ({ createGroup: vi.fn(), start: vi.fn(), get: vi.fn(), addMessages: vi.fn(), finish: vi.fn(), remove: vi.fn() }));

vi.mock('../api/importApi', () => ({ importCalls: calls }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/entities/chat', () => ({
  useGetOneOnOneChatsQuery: () => ({ data: undefined }),
  useGetGroupChatsQuery: () => ({ data: undefined }),
  useGetGroupDetailsQuery: () => ({ data: undefined }),
}));

const at = '2021-03-14T12:00:00.000Z';
const running: ChatImport = {
  id: '9', chat_id: '7', source: 'telegram', state: 'running', message_count: 3, file_count: 0, created_at: at, finished_at: null,
  first_at: at, last_at: at, next_index: 0, imported_by: '1', senders: [],
};
const telegramJson = JSON.stringify({
  name: 'Trip', type: 'personal_chat', id: 1,
  messages: [
    { id: 1, type: 'message', date_unixtime: '1615726800', from: 'Anna', from_id: 'user11', text: 'Hi Bob' },
    { id: 2, type: 'message', date_unixtime: '1615726900', from: 'Bob K.', from_id: 'user22', text: 'Hi Anna', reply_to_message_id: 1 },
    { id: 3, type: 'message', date_unixtime: '1615727000', from: 'Bob K.', from_id: 'user22', text: 'See you' },
  ],
});
const chatFile = () => new File([telegramJson], 'result.json', { type: 'application/json' });
const me = { id: '1', username: 'anna', displayName: 'Anna' };
const chat = { chatId: '7', name: 'Bob K.', isGroup: false, peer: { id: '2', username: 'bobk', displayName: 'Bob K.' } };

const show = (target: typeof chat | null = chat) => render(<ImportChatDialog open onOpenChange={vi.fn()} me={me} chat={target ?? undefined} />);
const pick = (file: File) => fireEvent.change(screen.getByTestId('import-file-input'), { target: { files: [file] } });
const resume = (fileKey: string, total = 3) => localStorage.setItem('chat-import:pending', JSON.stringify({
  importId: '9', chatId: '7', title: 'Trip', source: 'telegram', total, fileKey, uploaded: {},
}));

beforeEach(() => {
  localStorage.clear();
  Object.values(calls).forEach((call) => call.mockReset());
  calls.start.mockResolvedValue({ data: running });
  calls.addMessages.mockImplementation(async (_id: string, body: AddImportMessagesRequest) => (
    { data: { next_index: body.from_index + body.messages.length } }
  ));
  calls.finish.mockResolvedValue({ data: { ...running, state: 'done' } });
});

afterEach(() => localStorage.clear());

describe('ImportChatDialog', () => {
  it('walks from the file to a preview, suggested senders and a finished import', async () => {
    show();
    pick(chatFile());
    expect(await screen.findByTestId('import-summary')).toHaveTextContent('Trip');
    expect(screen.getByTestId('import-summary')).toHaveTextContent('3 messages');
    expect(screen.queryByText(en.chatImport.preview.dateOrder)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.next }));

    expect(screen.getByRole('combobox', { name: 'Anna' })).toHaveValue('me');
    expect(screen.getByRole('combobox', { name: 'Bob K.' })).toHaveValue('2');
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.start }));

    expect(await screen.findByText('3 messages imported.')).toBeInTheDocument();
    expect(calls.start).toHaveBeenCalledWith('7', expect.objectContaining({
      source: 'telegram', message_count: 3,
      senders: [{ key: 'user22', name: 'Bob K.', message_count: 2, user_id: '2' }, { key: 'user11', name: 'Anna', message_count: 1, me: true }],
    }));
    expect(calls.addMessages.mock.calls[0][1].messages[1]).toMatchObject({ index: 1, sender_key: 'user22', reply_to_index: 0 });
    expect(calls.createGroup).not.toHaveBeenCalled();
    expect(localStorage.getItem('chat-import:pending')).toBeNull();
  });

  it('lets the user keep a name as text', async () => {
    show();
    pick(chatFile());
    fireEvent.click(await screen.findByRole('button', { name: en.chatImport.actions.next }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Bob K.' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.start }));
    await screen.findByText('3 messages imported.');
    expect(calls.start.mock.calls[0][1].senders[0]).toEqual({ key: 'user22', name: 'Bob K.', message_count: 2 });
  });

  it('creates a group named after the export when started from the chat list', async () => {
    calls.createGroup.mockResolvedValue({ data: { id: '77' } });
    show(null);
    pick(chatFile());
    expect(await screen.findByRole('radio', { name: 'New group “Trip”' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.next }));
    expect(screen.getByRole('combobox', { name: 'Anna' })).toHaveValue('me');
    expect(screen.getByRole('combobox', { name: 'Bob K.' })).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.start }));
    await screen.findByText('3 messages imported.');
    expect(calls.createGroup).toHaveBeenCalledWith('Trip');
    expect(calls.start).toHaveBeenCalledWith('77', expect.anything());
  });

  it('continues a stopped import after a reload when the same file is chosen', async () => {
    const file = chatFile();
    resume(fileKeyOf([file]));
    calls.get.mockResolvedValue({ data: { ...running, next_index: 2 } });
    show();
    expect(await screen.findByTestId('import-resume')).toHaveTextContent('stopped at message 2 of 3');
    pick(file);
    expect(await screen.findByText('3 messages imported.')).toBeInTheDocument();
    expect(calls.start).not.toHaveBeenCalled();
    expect(calls.addMessages.mock.calls[0][1]).toMatchObject({ from_index: 2, messages: [expect.objectContaining({ index: 2 })] });
  });

  it('refuses another file while a stopped import waits', async () => {
    resume('other');
    calls.get.mockResolvedValue({ data: running });
    show();
    await screen.findByTestId('import-resume');
    pick(chatFile());
    expect(await screen.findByRole('alert')).toHaveTextContent(en.chatImport.errors.wrongFile);
  });

  it('removes what a stopped import added when asked', async () => {
    resume('other');
    calls.get.mockResolvedValue({ data: running });
    calls.remove.mockResolvedValue({ data: null });
    show();
    fireEvent.click(await screen.findByRole('button', { name: en.chatImport.resume.discard }));
    await waitFor(() => expect(screen.queryByTestId('import-resume')).not.toBeInTheDocument());
    expect(calls.remove).toHaveBeenCalledWith('9');
    expect(localStorage.getItem('chat-import:pending')).toBeNull();
  });

  it('forgets a stopped import the server already finished', async () => {
    resume('k');
    calls.get.mockResolvedValue({ data: { ...running, state: 'done' } });
    show();
    await waitFor(() => expect(localStorage.getItem('chat-import:pending')).toBeNull());
    expect(screen.queryByTestId('import-resume')).not.toBeInTheDocument();
  });

  it('offers to try again when a batch keeps failing', async () => {
    calls.addMessages.mockResolvedValueOnce({ error: { status: 400, data: null } });
    calls.get.mockResolvedValue({ data: { ...running, next_index: 0 } });
    show();
    pick(chatFile());
    fireEvent.click(await screen.findByRole('button', { name: en.chatImport.actions.next }));
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.start }));
    expect(await screen.findByRole('alert')).toHaveTextContent(en.chatImport.errors.stopped);
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.retry }));
    expect(await screen.findByText('3 messages imported.')).toBeInTheDocument();
  });

  it('explains how to export JSON when a Telegram HTML export is chosen', async () => {
    show();
    pick(new File(['<html></html>'], 'messages.html', { type: 'text/html' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(en.chatImport.errors.telegramHtml);
  });

  it('shows why the server refused to start', async () => {
    const message = 'the chat already has imported history from that period';
    calls.start.mockResolvedValue({ error: { status: 409, data: { code: 'conflict', errors: [{ message }] } } });
    show();
    pick(chatFile());
    fireEvent.click(await screen.findByRole('button', { name: en.chatImport.actions.next }));
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.start }));
    expect(await screen.findByRole('alert')).toHaveTextContent(en.chatImport.errors.overlap);
  });
});
