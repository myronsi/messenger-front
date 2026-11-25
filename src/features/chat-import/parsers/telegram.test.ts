import { describe, expect, it } from 'vitest';
import { parseTelegram, telegramText } from './telegram';

const unix = (minute: number) => String(Date.UTC(2021, 2, 14, 12, minute) / 1000);
const iso = (minute: number) => new Date(Date.UTC(2021, 2, 14, 12, minute)).toISOString();
const all = () => true;

const message = (id: number, fields: Record<string, unknown>) => ({
  id, type: 'message', date: '2021-03-14T13:00:00', date_unixtime: unix(id), from: 'Anna', from_id: 'user1', text: '', text_entities: [], ...fields,
});

const exportOf = (messages: unknown[], extra: Record<string, unknown> = {}) => ({ name: 'Trip', type: 'private_group', id: 1, messages, ...extra });

describe('telegramText', () => {
  it('reads text as a string', () => {
    expect(telegramText({ text: 'Hello' })).toBe('Hello');
  });

  it('joins text parts as plain text and keeps links', () => {
    expect(telegramText({ text: ['See ', { type: 'bold', text: 'this' }, ': ', { type: 'text_link', text: 'site', href: 'https://example.test' }] }))
      .toBe('See this: site (https://example.test)');
  });

  it('prefers text_entities and keeps a link whose text is the address once', () => {
    expect(telegramText({ text: 'ignored', text_entities: [{ type: 'link', text: 'https://a.test' }, { type: 'plain', text: '!' }] }))
      .toBe('https://a.test!');
  });
});

describe('parseTelegram', () => {
  it('reads senders, dates, replies and forwards', () => {
    const chat = parseTelegram(exportOf([
      message(1, { text: 'Hi' }),
      message(2, { from: 'Bob', from_id: 'user2', text: 'Hey', reply_to_message_id: 1 }),
      message(3, { text: 'Look', forwarded_from: 'News channel', reply_to_message_id: 999 }),
    ]), all);

    expect(chat.title).toBe('Trip');
    expect(chat.messages).toEqual([
      { index: 0, senderKey: 'user1', originalAt: iso(1), text: 'Hi' },
      { index: 1, senderKey: 'user2', originalAt: iso(2), text: 'Hey', replyToIndex: 0 },
      { index: 2, senderKey: 'user1', originalAt: iso(3), text: 'Look', forwardedFromName: 'News channel' },
    ]);
    expect(chat.senders).toEqual([{ key: 'user1', name: 'Anna', messageCount: 2 }, { key: 'user2', name: 'Bob', messageCount: 1 }]);
    expect(chat).toMatchObject({ source: 'telegram', firstAt: iso(1), lastAt: iso(3), fileCount: 0 });
  });

  it('falls back to the local date text without date_unixtime', () => {
    const chat = parseTelegram(exportOf([{ id: 1, type: 'message', date: '2021-03-14T13:05:00', from: 'Anna', from_id: 'user1', text: 'Hi' }]), all);
    expect(chat.messages[0].originalAt).toBe(new Date(2021, 2, 14, 13, 5).toISOString());
  });

  it('names a deleted account', () => {
    const chat = parseTelegram(exportOf([message(1, { from: null, from_id: 'user9', text: 'Old' })]), all);
    expect(chat.senders[0]).toEqual({ key: 'user9', name: 'Deleted Account', messageCount: 1 });
  });

  it.each([
    [{ photo: 'photos/photo_1@14-03-2021_13-00-00.jpg' }, { path: 'photos/photo_1@14-03-2021_13-00-00.jpg', name: 'photo_1@14-03-2021_13-00-00.jpg', kind: 'image' }],
    [{ file: 'voice_messages/audio_1.ogg', media_type: 'voice_message', mime_type: 'audio/ogg' }, { path: 'voice_messages/audio_1.ogg', name: 'audio_1.ogg', kind: 'voice' }],
    [{ file: 'video_files/v.mp4', media_type: 'video_file' }, { path: 'video_files/v.mp4', name: 'v.mp4', kind: 'video' }],
    [{ file: 'round_video_messages/r.mp4', media_type: 'video_message' }, { path: 'round_video_messages/r.mp4', name: 'r.mp4', kind: 'video' }],
    [{ file: 'video_files/a.gif.mp4', media_type: 'animation' }, { path: 'video_files/a.gif.mp4', name: 'a.gif.mp4', kind: 'video' }],
    [{ file: 'files/song.mp3', file_name: 'Song.mp3', media_type: 'audio_file' }, { path: 'files/song.mp3', name: 'Song.mp3', kind: 'audio' }],
    [{ file: 'stickers/s.webp', media_type: 'sticker', sticker_emoji: '😀' }, { path: 'stickers/s.webp', name: 's.webp', kind: 'sticker' }],
    [{ file: 'stickers/s.webm', media_type: 'sticker', sticker_emoji: '😀' }, { path: 'stickers/s.webm', name: 's.webm', kind: 'video' }],
    [{ file: 'files/report.pdf', file_name: 'Report.pdf' }, { path: 'files/report.pdf', name: 'Report.pdf', kind: 'file' }],
  ])('reads media %o', (fields, attachment) => {
    const chat = parseTelegram(exportOf([message(1, fields)]), all);
    expect(chat.messages[0].attachment).toEqual(attachment);
    expect(chat.fileCount).toBe(1);
  });

  it('keeps the caption of media', () => {
    const chat = parseTelegram(exportOf([message(1, { photo: 'photos/p.jpg', text: 'Sunset' })]), all);
    expect(chat.messages[0]).toMatchObject({ text: 'Sunset', attachment: { kind: 'image' } });
  });

  it('turns media that is not in the export into grey lines', () => {
    const notIncluded = '(File not included. Change data exporting settings to download.)';
    const chat = parseTelegram(exportOf([
      message(1, { photo: notIncluded }),
      message(2, { file: notIncluded, file_name: 'Report.pdf' }),
      message(3, { file: 'voice_messages/missing.ogg', media_type: 'voice_message' }),
      message(4, { file: 'stickers/a.tgs', media_type: 'sticker', sticker_emoji: '🐱' }),
      message(5, { photo: notIncluded, text: 'Caption stays' }),
    ]), (path) => !path.includes('missing'));
    expect(chat.messages.map(({ notice, text }) => ({ notice, text }))).toEqual([
      { notice: { code: 'mediaOmitted', detail: 'image' }, text: '' },
      { notice: { code: 'mediaOmitted', detail: 'Report.pdf' }, text: '' },
      { notice: { code: 'mediaOmitted', detail: 'voice' }, text: '' },
      { notice: { code: 'sticker', detail: '🐱' }, text: '' },
      { notice: undefined, text: 'Caption stays' },
    ]);
    expect(chat.fileCount).toBe(0);
  });

  it('turns polls, locations and contacts into grey lines', () => {
    const chat = parseTelegram(exportOf([
      message(1, { poll: { question: 'Where do we meet?', answers: [] } }),
      message(2, { location_information: { latitude: 52.5, longitude: 13.4 } }),
      message(3, { location_information: { latitude: 1, longitude: 2 }, place_name: 'Cafe' }),
      message(4, { contact_information: { first_name: 'Carla', last_name: 'M', phone_number: '+100' } }),
    ]), all);
    expect(chat.messages.map((item) => item.notice)).toEqual([
      { code: 'poll', detail: 'Where do we meet?' },
      { code: 'location', detail: '52.5, 13.4' },
      { code: 'location', detail: 'Cafe' },
      { code: 'contact', detail: 'Carla M' },
    ]);
    expect(chat.messages.every((item) => item.senderKey === 'user1')).toBe(true);
  });

  it('turns known service messages into grey lines without a sender and skips the rest', () => {
    const service = (id: number, fields: Record<string, unknown>) => ({ id, type: 'service', date_unixtime: unix(id), actor: 'Anna', actor_id: 'user1', ...fields });
    const chat = parseTelegram(exportOf([
      service(1, { action: 'create_group', title: 'Trip' }),
      service(2, { action: 'invite_members', members: ['Bob', null] }),
      service(3, { action: 'pin_message', message_id: 1 }),
      service(4, { action: 'phone_call', duration_seconds: 65 }),
      service(5, { action: 'clear_history' }),
      message(6, { text: 'Hi' }),
    ]), all);
    expect(chat.messages.map(({ senderKey, notice }) => ({ senderKey, notice }))).toEqual([
      { senderKey: null, notice: { code: 'groupCreated', actor: 'Anna', detail: 'Trip' } },
      { senderKey: null, notice: { code: 'membersAdded', actor: 'Anna', detail: 'Bob, Deleted Account' } },
      { senderKey: null, notice: { code: 'messagePinned', actor: 'Anna', detail: '' } },
      { senderKey: null, notice: { code: 'call', actor: 'Anna', detail: '65' } },
      { senderKey: 'user1', notice: undefined },
    ]);
    expect(chat.senders).toHaveLength(1);
  });

  it('names saved messages after Telegram', () => {
    expect(parseTelegram(exportOf([message(1, { text: 'x' })], { name: null, type: 'saved_messages' }), all).title).toBe('Telegram');
  });

  it('refuses the export of a whole account', () => {
    expect(() => parseTelegram({ about: 'x', chats: { list: [] } }, all)).toThrow('telegramAccountExport');
  });

  it('refuses other JSON and empty chats', () => {
    expect(() => parseTelegram([1, 2], all)).toThrow('unknownFormat');
    expect(() => parseTelegram({ name: 'x' }, all)).toThrow('unknownFormat');
    expect(() => parseTelegram(exportOf([]), all)).toThrow('emptyChat');
  });
});
