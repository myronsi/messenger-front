import { describe, expect, it } from 'vitest';
import type { Message } from './types';
import { pendingImportIds } from './importedMessages';

const line = (importId: string, state: 'me' | 'confirmed' | 'unconfirmed'): Pick<Message, 'import'> => ({
  import: { import_id: importId, source: 'whatsapp', original_at: '2019-03-12T14:05:00Z', sender_name: 'Bob', sender_state: state },
});

describe('pendingImportIds', () => {
  it('lists the imports that still have an unconfirmed sender among the loaded messages', () => {
    const ids = pendingImportIds([line('9', 'me'), line('9', 'unconfirmed'), line('12', 'me'), line('12', 'confirmed'), { import: null }, {}]);
    expect([...ids]).toEqual(['9']);
  });

  it('is empty when every sender is confirmed', () => {
    expect(pendingImportIds([line('9', 'me'), line('9', 'confirmed')]).size).toBe(0);
  });
});
