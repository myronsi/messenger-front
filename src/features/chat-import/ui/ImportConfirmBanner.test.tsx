import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { ChatImport } from '../api/importTypes';
import { ImportConfirmBanner } from './ImportConfirmBanner';

const state = vi.hoisted(() => ({ imports: [] as unknown[], decide: vi.fn() }));

vi.mock('../api/importApi', () => ({
  useGetChatImportsQuery: () => ({ data: state.imports }),
  useDecideImportSenderMutation: () => [state.decide, { isLoading: false }],
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/shared/api/currentUserApi', () => ({ useGetCurrentUserQuery: () => ({ data: { id: '2', username: 'bobk', account_display_name: 'Bob' } }) }));
vi.mock('@/entities/chat', () => ({ useGetGroupDetailsQuery: () => ({ data: undefined }) }));

const at = '2019-03-12T14:05:00Z';
const chatImport = (senderState: ChatImport['senders'][number]['state'], userId = '2'): ChatImport => ({
  id: '9', chat_id: '7', source: 'whatsapp', state: 'done', message_count: 3214, file_count: 0, created_at: at, finished_at: null,
  first_at: at, last_at: at, next_index: 3214, imported_by: '1',
  senders: [
    { key: 'Anna', name: 'Anna', message_count: 1712, state: 'me', user_id: '1' },
    { key: 'Bob K.', name: 'Bob K.', message_count: 1502, state: senderState, user_id: userId },
  ],
});
const chat = { chatId: '7', name: 'Anna', isGroup: false, peer: { id: '1', username: 'anna', displayName: 'Anna' } };

beforeEach(() => {
  state.decide.mockReset();
  state.decide.mockResolvedValue({ data: {} });
});

describe('ImportConfirmBanner', () => {
  it('asks the assigned member whether the messages are theirs', () => {
    state.imports = [chatImport('pending')];
    render(<ImportConfirmBanner chat={chat} />);
    expect(screen.getByTestId('import-confirm-banner'))
      .toHaveTextContent('Anna imported 3,214 messages from WhatsApp. 1,502 are from “Bob K.”. Are these yours?');
  });

  it.each([['confirm', en.chatImport.banner.yes], ['decline', en.chatImport.banner.no]])('sends %s', async (decision, label) => {
    state.imports = [chatImport('pending')];
    const answered = vi.fn();
    render(<ImportConfirmBanner chat={chat} onAnswered={answered} />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    await vi.waitFor(() => expect(answered).toHaveBeenCalled());
    expect(state.decide).toHaveBeenCalledWith({ importId: '9', chatId: '7', key: 'Bob K.', decision });
  });

  it('says when the answer could not be saved', async () => {
    state.imports = [chatImport('pending')];
    state.decide.mockResolvedValue({ error: { status: 500 } });
    render(<ImportConfirmBanner chat={chat} />);
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.banner.yes }));
    expect(await screen.findByRole('alert')).toHaveTextContent(en.chatImport.banner.failed);
  });

  it.each([['confirmed', '2'], ['declined', '2'], ['pending', '3']] as const)('stays hidden when the sender is %s for user %s', (senderState, userId) => {
    state.imports = [chatImport(senderState, userId)];
    render(<ImportConfirmBanner chat={chat} />);
    expect(screen.queryByTestId('import-confirm-banner')).not.toBeInTheDocument();
  });
});
