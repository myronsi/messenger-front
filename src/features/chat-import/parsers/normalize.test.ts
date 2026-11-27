import { describe, expect, it } from 'vitest';
import type { ParsedMessage } from '../model/types';
import { limitFiles, MAX_TEXT_LENGTH, maskPhone, maskPhoneMentions, splitLongMessages, splitText } from './normalize';

const at = '2026-05-14T19:09:00.000Z';
const message = (index: number, fields: Partial<ParsedMessage> = {}): ParsedMessage => ({ index, senderKey: 'a', originalAt: at, text: `m${index}`, ...fields });

describe('maskPhone', () => {
  it.each([
    ['+49 151 23456789', '+49 ••• 789'],
    ['+7 (912) 345-67-89', '+7 ••• 789'],
    ['0151 2345678', '••• 678'],
    ['Anna', 'Anna'],
    ['Room 101', 'Room 101'],
    ['+49 12', '+49 12'],
  ])('masks %s', (name, masked) => {
    expect(maskPhone(name)).toBe(masked);
  });

  it('masks phone mentions in text', () => {
    expect(maskPhoneMentions('hi @4915123456789 and @Anna')).toBe('hi @••• 789 and @Anna');
  });
});

describe('splitText', () => {
  it('keeps short text and splits long text at a space or line break', () => {
    expect(splitText('short')).toEqual(['short']);
    const words = Array.from({ length: 2000 }, (_, i) => `word${i}`).join(' ');
    const parts = splitText(words);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => part.length <= MAX_TEXT_LENGTH)).toBe(true);
    expect(parts.join(' ')).toBe(words);
  });

  it('cuts text without spaces at the limit and never inside an emoji', () => {
    const text = `${'a'.repeat(MAX_TEXT_LENGTH - 1)}😀${'b'.repeat(10)}`;
    const parts = splitText(text);
    expect(parts[0]).toBe('a'.repeat(MAX_TEXT_LENGTH - 1));
    expect(parts.join('')).toBe(text);
  });
});

describe('splitLongMessages', () => {
  it('turns a long message into several and keeps replies pointing at the right message', () => {
    const long = 'x '.repeat(MAX_TEXT_LENGTH);
    const out = splitLongMessages([message(0, { text: long }), message(1, { replyToIndex: 0 }), message(2, { replyToIndex: 1 })]);
    expect(out.map((item) => item.index)).toEqual([0, 1, 2, 3]);
    expect(out[1]).toMatchObject({ senderKey: 'a', originalAt: at });
    expect(out[2]).toMatchObject({ text: 'm1', replyToIndex: 0 });
    expect(out[3]).toMatchObject({ text: 'm2', replyToIndex: 2 });
  });
});

describe('limitFiles', () => {
  it('keeps the newest distinct files and turns older ones into notes', () => {
    const file = (path: string) => ({ attachment: { path, name: path, kind: 'image' as const } });
    const messages = [message(0, file('a.jpg')), message(1, file('b.jpg')), message(2, file('a.jpg')), message(3, file('c.jpg'))];
    expect(limitFiles(messages, 2)).toEqual({ fileCount: 2, skippedFiles: 1 });
    expect(messages[1]).toMatchObject({ notice: { code: 'fileOverLimit', detail: 'b.jpg' } });
    expect(messages[1].attachment).toBeUndefined();
    expect(messages[0].attachment?.path).toBe('a.jpg');
  });
});
