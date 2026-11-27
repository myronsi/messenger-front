import { fireEvent, screen } from '@testing-library/react';
import type { ChatImport } from '../api/importTypes';

const at = '2021-03-14T12:00:00.000Z';

export const runningImport: ChatImport = {
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

export const chatFile = () => new File([telegramJson], 'result.json', { type: 'application/json' });
export const importMe = { id: '1', username: 'anna', displayName: 'Anna' };
export const importChat = { chatId: '7', name: 'Bob K.', isGroup: false, peer: { id: '2', username: 'bobk', displayName: 'Bob K.' } };
export const pickFile = (file: File) => fireEvent.change(screen.getByTestId('import-file-input'), { target: { files: [file] } });
