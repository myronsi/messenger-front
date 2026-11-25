import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { limitErrorText, startErrorText } from './importErrors';
import type { ParsedChat } from './types';

const t = en.chatImport;
const conflict = (message: string) => ({ status: 409, data: { code: 'conflict', errors: [{ message }] } });

describe('startErrorText', () => {
  it.each([
    [conflict('the chat already has imported history from that period'), t.errors.overlap],
    [conflict('an import of this chat is running'), t.errors.running],
    [conflict('there is no room for the imported history in this chat'), t.errors.noRoom],
    [conflict('something else'), t.errors.startFailed],
    [{ status: 403, data: { code: 'forbidden' } }, t.errors.notAllowed],
    [{ status: 'FETCH_ERROR', error: 'offline' }, t.errors.startFailed],
  ])('explains %o', (error, text) => {
    expect(startErrorText(error, t)).toBe(text);
  });
});

describe('limitErrorText', () => {
  const chat = (senders: number): ParsedChat => ({
    source: 'telegram', title: 'x', messages: [], fileCount: 0, firstAt: null, lastAt: null,
    senders: Array.from({ length: senders }, (_, index) => ({ key: `s-${index}`, name: `n${index}`, messageCount: 1 })),
  });

  it('refuses more than 200 senders', () => {
    expect(limitErrorText(chat(200), t)).toBeNull();
    expect(limitErrorText(chat(201), t)).toBe('An import can hold up to 200 different senders.');
  });
});
