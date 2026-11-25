import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { de } from '@/shared/lang/de';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { importedMessage, MAX_CONTENT_LENGTH, startRequest } from './importRequest';
import { noticeText } from './noticeText';
import type { ParsedChat, ParsedMessage } from './types';

const at = '2019-03-12T14:05:00.000Z';
const english = (notice: Parameters<typeof noticeText>[0]) => noticeText(notice, en as Translations);
const context = (ids: Record<string, string> = {}, skipped: Record<string, 'fileTooLarge'> = {}) => ({
  attachmentIds: new Map(Object.entries(ids)), skipped: new Map(Object.entries(skipped)), noticeText: english,
});
const message = (fields: Partial<ParsedMessage>): ParsedMessage => ({ index: 3, senderKey: 's-2', originalAt: at, text: '', ...fields });

describe('startRequest', () => {
  const chat: ParsedChat = {
    source: 'whatsapp', title: 'Trip', messages: [message({ index: 0 }), message({ index: 1 })], fileCount: 1, firstAt: at, lastAt: at,
    senders: [{ key: 's-2', name: 'Bob', messageCount: 2 }, { key: 's-1', name: 'Anna', messageCount: 0 }, { key: 's-3', name: 'Dan', messageCount: 0 }],
  };

  it('sends counts, dates, me and the suggested members', () => {
    expect(startRequest(chat, { 's-2': '2', 's-1': 'me', 's-3': null })).toEqual({
      source: 'whatsapp', message_count: 2, file_count: 1, first_at: at, last_at: at,
      senders: [
        { key: 's-2', name: 'Bob', message_count: 2, user_id: '2' },
        { key: 's-1', name: 'Anna', message_count: 0, me: true },
        { key: 's-3', name: 'Dan', message_count: 0 },
      ],
    });
  });

  it('keeps names within 128 characters', () => {
    const long = { ...chat, senders: [{ key: 's-1', name: 'x'.repeat(200), messageCount: 1 }] };
    expect(startRequest(long, {}).senders[0].name).toHaveLength(128);
  });
});

describe('importedMessage', () => {
  it('sends text with its reply', () => {
    expect(importedMessage(message({ text: 'Hi', replyToIndex: 1, forwardedFromName: 'News' }), context())).toEqual({
      index: 3, sender_key: 's-2', original_at: at, type: 'text', content: 'Hi', reply_to_index: 1,
    });
  });

  it('cuts text that is longer than the server allows', () => {
    const sent = importedMessage(message({ text: 'a'.repeat(MAX_CONTENT_LENGTH + 10) }), context());
    expect(sent.content).toHaveLength(MAX_CONTENT_LENGTH);
    expect(sent.content?.endsWith('…')).toBe(true);
  });

  it('links an uploaded file and marks voice notes', () => {
    const voice = message({ attachment: { path: 'a.opus', name: 'a.opus', kind: 'voice' } });
    const photo = message({ text: 'Sunset', attachment: { path: 'p.jpg', name: 'p.jpg', kind: 'image' } });
    expect(importedMessage(voice, context({ 'a.opus': '50' }))).toMatchObject({ type: 'voice', content: null, attachment_ids: ['50'] });
    expect(importedMessage(photo, context({ 'p.jpg': '51' }))).toMatchObject({ type: 'file', content: 'Sunset', attachment_ids: ['51'] });
  });

  it('turns a file that was not uploaded into a note that keeps the caption', () => {
    const video = message({ text: 'Party', attachment: { path: 'v.mp4', name: 'v.mp4', kind: 'video' } });
    expect(importedMessage(video, context({}, { 'v.mp4': 'fileTooLarge' }))).toMatchObject({
      type: 'note', content: 'File not imported: v.mp4 (too large)\nParty',
    });
    expect(importedMessage(video, context())).toMatchObject({ type: 'note', content: 'File not imported: v.mp4 (missing)\nParty' });
    expect(importedMessage(video, context())).not.toHaveProperty('sender_key');
  });

  it('writes notes without a sender for polls and service lines', () => {
    const poll = importedMessage(message({ notice: { code: 'poll', detail: 'Where?' } }), context());
    expect(poll).toMatchObject({ type: 'note', content: 'Poll: Where?' });
    expect(poll).not.toHaveProperty('sender_key');
    const service = importedMessage(message({ senderKey: null, notice: { code: 'service', detail: 'Anna added Carla' } }), context());
    expect(service).toMatchObject({ type: 'note', content: 'Anna added Carla' });
    expect(service).not.toHaveProperty('sender_key');
  });
});

describe('noticeText', () => {
  it.each([
    [{ code: 'mediaOmitted', detail: 'image' }, 'Photo not included'],
    [{ code: 'mediaOmitted', detail: '' }, 'Media not included'],
    [{ code: 'mediaOmitted', detail: 'Report.pdf' }, 'Report.pdf not included'],
    [{ code: 'call', detail: '65' }, 'Call, 1:05'],
    [{ code: 'call', detail: '3725' }, 'Call, 1:02:05'],
    [{ code: 'call', detail: '' }, 'Call'],
    [{ code: 'membersAdded', actor: 'Anna', detail: 'Bob, Carla' }, 'Anna added Bob, Carla'],
    [{ code: 'sticker', detail: '🐱' }, 'Sticker 🐱'],
  ] as const)('writes %o as %s', (notice, text) => {
    expect(english(notice)).toBe(text);
  });

  it('uses the importer language', () => {
    expect(noticeText({ code: 'location', detail: 'Cafe' }, de as Translations)).toBe('Standort: Cafe');
  });
});
