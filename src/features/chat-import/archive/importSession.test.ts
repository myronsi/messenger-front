import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { createImportReader } from '../model/importReader';
import { sampleChat } from '../parsers/whatsappFixtures';
import { openImportSession } from './importSession';

const bytes = (length: number, seed: number) => Uint8Array.from({ length }, (_, index) => (index * seed) % 251);

const zipFile = (name: string, entries: Record<string, Uint8Array | [Uint8Array, { level: 0 }]>) => (
  new File([zipSync(entries)], name, { type: 'application/zip' })
);

const telegramJson = JSON.stringify({
  name: 'Trip', type: 'private_group', id: 1,
  messages: [
    { id: 1, type: 'message', date_unixtime: '1615726800', from: 'Anna', from_id: 'user1', text: 'Hi' },
    { id: 2, type: 'message', date_unixtime: '1615726900', from: 'Bob', from_id: 'user2', text: '', photo: 'photos/photo_1.jpg' },
  ],
});

const inFolder = (file: File, path: string) => {
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
};

const open = (files: File[]) => openImportSession(files, { localeOrder: 'dmy' });

describe('openImportSession', () => {
  it('opens a Telegram export zipped with its folder and extracts media', async () => {
    const photo = bytes(5000, 7);
    const session = await open([zipFile('ChatExport.zip', {
      'ChatExport_2021-03-14/result.json': strToU8(telegramJson),
      'ChatExport_2021-03-14/photos/photo_1.jpg': [photo, { level: 0 }],
    })]);

    expect(session.chat.source).toBe('telegram');
    expect(session.chat.messages[1].attachment).toEqual({ path: 'ChatExport_2021-03-14/photos/photo_1.jpg', name: 'photo_1.jpg', kind: 'image', size: 5000 });
    const file = await session.file('ChatExport_2021-03-14/photos/photo_1.jpg');
    expect(file).toMatchObject({ name: 'photo_1.jpg', type: 'image/jpeg', size: 5000 });
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(photo);
  });

  it('opens a Telegram export picked as a folder', async () => {
    const session = await open([
      inFolder(new File([telegramJson], 'result.json'), 'ChatExport/result.json'),
      inFolder(new File([bytes(10, 3)], 'photo_1.jpg'), 'ChatExport/photos/photo_1.jpg'),
    ]);
    expect(session.chat.messages[1].attachment?.path).toBe('ChatExport/photos/photo_1.jpg');
    expect((await session.file('ChatExport/photos/photo_1.jpg')).type).toBe('image/jpeg');
  });

  it('opens result.json alone and shows its media as not included', async () => {
    const session = await open([new File([telegramJson], 'result.json')]);
    expect(session.chat.messages[1].notice).toEqual({ code: 'mediaOmitted', detail: 'image' });
  });

  it('opens a WhatsApp zip with compressed and stored media', async () => {
    const voice = bytes(70_000, 13);
    const session = await open([zipFile('WhatsApp Chat - Bob K.zip', {
      '_chat.txt': strToU8(sampleChat('ios', 'en', 24)),
      '00000003-PHOTO-2021-03-14-14-08-10.jpg': [bytes(300, 5), { level: 0 }],
      '00000004-AUDIO-2021-03-15-08-02-00.opus': voice,
    })]);

    expect(session.chat).toMatchObject({ source: 'whatsapp', title: 'Bob K', fileCount: 2 });
    expect(session.chat.messages[5].attachment).toMatchObject({ kind: 'voice', size: 70_000 });
    expect(new Uint8Array(await (await session.file('00000004-AUDIO-2021-03-15-08-02-00.opus')).arrayBuffer())).toEqual(voice);
  });

  it('opens a WhatsApp text file without media and switches the date order', async () => {
    const content = ['04/03/2021, 14:08 - Bob: Hi', '05/03/2021, 09:00 - Anna: IMG-1.jpg (file attached)'].join('\n');
    const session = await open([new File([content], 'WhatsApp Chat with Bob.txt')]);
    expect(session.chat).toMatchObject({ title: 'Bob', dateOrder: 'dmy', dateOrderCertain: false });
    expect(session.chat.messages[1].notice).toEqual({ code: 'fileMissing', detail: 'IMG-1.jpg' });
    const switched = session.reparse('mdy');
    expect(switched.messages[0].originalAt).toBe(new Date(2021, 3, 3, 14, 8).toISOString());
  });

  it('picks the chat text among several text files', async () => {
    const session = await open([zipFile('export.zip', {
      'notes.txt': strToU8('just notes'),
      'chat.txt': strToU8('14/03/2021, 14:08 - Bob: Hi'),
    })]);
    expect(session.chat.messages[0].text).toBe('Hi');
  });

  it('refuses a Telegram HTML export', async () => {
    await expect(open([zipFile('export.zip', { 'ChatExport/messages.html': strToU8('<html></html>') })])).rejects.toThrow('telegramHtml');
  });

  it('refuses a broken zip and a zip without a chat', async () => {
    await expect(open([new File([strToU8('PK\u0003\u0004 broken')], 'x.zip')])).rejects.toThrow('brokenFile');
    await expect(open([zipFile('x.zip', { 'a.jpg': bytes(3, 1) })])).rejects.toThrow('noChatFile');
  });

  it('refuses broken JSON', async () => {
    await expect(open([new File(['{nope'], 'result.json')])).rejects.toThrow('brokenFile');
  });
});

describe('createImportReader without a worker', () => {
  it('opens, reparses and reads files in the page', async () => {
    const reader = createImportReader(false);
    const content = ['04/03/2021, 14:08 - Bob: Hi'].join('\n');
    const chat = await reader.open([new File([content], 'chat.txt')]);
    expect(chat.messages).toHaveLength(1);
    expect((await reader.reparse(chat.dateOrder === 'dmy' ? 'mdy' : 'dmy')).dateOrder).not.toBe(chat.dateOrder);
    await expect(reader.file('missing.jpg')).rejects.toThrow('missing');
    reader.close();
  });
});
