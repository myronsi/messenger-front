import { describe, expect, it } from 'vitest';
import { importEventEffect } from './useImportedHistorySync';

const update = (state: string) => ({ type: 'import_update', chat_id: '7', data: { import_id: '9', state } });
const sender = (state: string) => ({ type: 'import_sender_update', chat_id: '8', data: { import_id: '9', sender: { key: 's-1', state } } });

describe('importEventEffect', () => {
  it.each([['done', true], ['removing', true], ['running', false]])('reloads the chat for an import that is %s: %s', (state, reload) => {
    expect(importEventEffect(update(state))).toEqual({ chatId: '7', reload });
  });

  it.each([['confirmed', true], ['unassigned', true], ['declined', true], ['pending', false]])('reloads for a sender that is %s: %s', (state, reload) => {
    expect(importEventEffect(sender(state))).toEqual({ chatId: '8', reload });
  });

  it('ignores other events', () => {
    expect(importEventEffect({ type: 'message', chat_id: '7', data: {} })).toBeNull();
    expect(importEventEffect({ type: 'import_update', data: { import_id: '9', state: 'done' } })).toBeNull();
    expect(importEventEffect(null)).toBeNull();
  });
});
