import { describe, expect, it } from 'vitest';
import { importEventChat } from './useImportedHistorySync';

describe('importEventChat', () => {
  it('reads the chat of import events', () => {
    expect(importEventChat({ type: 'import_update', chat_id: '7', data: { import_id: '9', state: 'done' } })).toBe('7');
    expect(importEventChat({ type: 'import_sender_update', chat_id: '8', data: { import_id: '9', sender: { key: 'a', state: 'confirmed' } } })).toBe('8');
  });

  it('ignores other events', () => {
    expect(importEventChat({ type: 'message', chat_id: '7', data: {} })).toBeNull();
    expect(importEventChat(null)).toBeNull();
  });
});
