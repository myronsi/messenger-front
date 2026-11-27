import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { ChatImport } from '../api/importTypes';
import { setActiveImport } from '../model/activeImport';
import { ImportStatusBanner } from './ImportStatusBanner';

const state = vi.hoisted(() => ({ imports: [] as unknown[], remove: vi.fn(), me: '1', polling: [] as unknown[] }));

vi.mock('../api/importApi', () => ({
  useGetChatImportsQuery: (_id: unknown, options: { pollingInterval?: number }) => {
    state.polling.push(options.pollingInterval);
    return { data: state.imports };
  },
  useRemoveImportMutation: () => [state.remove, { isLoading: false }],
}));
vi.mock('./ImportChatDialog', () => ({ ImportChatDialog: () => <div data-testid="import-chat-dialog" /> }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/shared/api/currentUserApi', () => ({
  useGetCurrentUserQuery: () => ({ data: { id: state.me, username: 'me', account_display_name: 'Me' } }),
}));
vi.mock('@/entities/chat', () => ({ useGetGroupDetailsQuery: () => ({ data: undefined }) }));

const at = '2026-05-14T19:09:00Z';
const running = (fields: Partial<ChatImport> = {}): ChatImport => ({
  id: '25', chat_id: '7', source: 'whatsapp', state: 'running', message_count: 146512, file_count: 3944, created_at: at, finished_at: null,
  first_at: at, last_at: at, next_index: 85000, imported_by: '1', senders: [], ...fields,
});
const chat = { chatId: '7', name: 'Anna', isGroup: false, peer: { id: '2', username: 'anna', displayName: 'Anna' } };

beforeEach(() => {
  state.me = '1';
  state.imports = [];
  state.polling = [];
  state.remove.mockReset();
  state.remove.mockResolvedValue({ data: null });
  localStorage.clear();
});

afterEach(() => act(() => setActiveImport(null)));

describe('ImportStatusBanner', () => {
  it('shows nothing without a running import', () => {
    state.imports = [running({ state: 'done' })];
    render(<ImportStatusBanner chat={chat} />);
    expect(screen.queryByTestId('import-status-banner')).not.toBeInTheDocument();
  });

  it('offers to continue or remove a paused import of mine and polls for changes', async () => {
    state.imports = [running()];
    render(<ImportStatusBanner chat={chat} />);
    const banner = screen.getByTestId('import-status-banner');
    expect(banner).toHaveTextContent(en.chatImport.status.paused);
    expect(banner).toHaveTextContent('58%');
    await waitFor(() => expect(state.polling[state.polling.length - 1]).toBe(15000));
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.status.continue }));
    expect(screen.getByTestId('import-chat-dialog')).toBeInTheDocument();
  });

  it('removes the imported part after asking', async () => {
    state.imports = [running()];
    localStorage.setItem('chat-import:pending', JSON.stringify({ importId: '25', chatId: '7', title: 'x', source: 'whatsapp', total: 1, fileKey: 'k', uploaded: {} }));
    render(<ImportStatusBanner chat={chat} />);
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.status.remove }));
    expect(screen.getByText('The 58% imported so far disappear for everyone in this chat.')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: en.chatImport.status.remove });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith({ importId: '25', chatId: '7' }));
    expect(localStorage.getItem('chat-import:pending')).toBeNull();
  });

  it('follows the import that runs in this tab without buttons', () => {
    state.imports = [running()];
    render(<ImportStatusBanner chat={chat} />);
    act(() => setActiveImport({ importId: '25', chatId: '7', done: 120000, total: 146512, waitingSeconds: 0 }));
    const banner = screen.getByTestId('import-status-banner');
    expect(banner).toHaveTextContent(en.chatImport.status.importing);
    expect(banner).toHaveTextContent('81%');
    expect(screen.queryByRole('button', { name: en.chatImport.status.continue })).not.toBeInTheDocument();
  });

  it('tells other members who is importing', () => {
    state.me = '2';
    state.imports = [running()];
    render(<ImportStatusBanner chat={{ ...chat, peer: { id: '1', username: 'anna', displayName: 'Anna' } }} />);
    expect(screen.getByTestId('import-status-banner')).toHaveTextContent('Anna is importing the chat history…');
    expect(screen.queryByRole('button', { name: en.chatImport.status.remove })).not.toBeInTheDocument();
  });
});
