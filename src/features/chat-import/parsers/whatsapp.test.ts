import { describe, expect, it } from 'vitest';
import { parseWhatsApp, type WhatsAppOptions } from './whatsapp';
import { LANGUAGES, MEDIA, renderLine, sampleChat, type Clock, type Language, type Platform } from './whatsappFixtures';

const at = (day: number, hour: number, minute: number, second = 0) => new Date(2021, 2, day, hour, minute, second).toISOString();

const options = (overrides: Partial<WhatsAppOptions> = {}): WhatsAppOptions => ({
  fileNames: [], hasFile: () => true, localeOrder: 'dmy', ...overrides,
});

const combos = (['ios', 'android'] as Platform[]).flatMap((platform) => (['en', 'de', 'ru', 'es'] as Language[])
  .flatMap((language) => ([12, 24] as Clock[]).map((clock) => [platform, language, clock] as const)));

describe('parseWhatsApp', () => {
  it.each(combos)('reads a %s export in %s with a %s-hour clock', (platform, language, clock) => {
    const media = MEDIA[platform];
    const chat = parseWhatsApp(sampleChat(platform, language, clock), options({ fileNames: [`${LANGUAGES[language].title}.txt`] }));

    expect(chat.title).toBe('Bob K.');
    expect(chat.dateOrder).toBe(language === 'en' && clock === 12 ? 'mdy' : 'dmy');
    expect(chat.dateOrderCertain).toBe(true);
    expect(chat.messages.map(({ index, senderKey, originalAt, text }) => ({ index, senderKey, originalAt, text }))).toEqual([
      { index: 0, senderKey: 's-1', originalAt: at(14, 9, 5), text: 'Hello Bob' },
      { index: 1, senderKey: 's-2', originalAt: at(14, 14, 7), text: 'Hi!\nsecond line\n\nthird line' },
      { index: 2, senderKey: 's-2', originalAt: at(14, 14, 8), text: platform === 'android' ? 'Look at this' : '' },
      { index: 3, senderKey: 's-1', originalAt: at(14, 14, 9), text: '' },
      { index: 4, senderKey: 's-2', originalAt: at(15, 8, 1), text: 'Fixed typo' },
      { index: 5, senderKey: 's-2', originalAt: at(15, 8, 2), text: '' },
      { index: 6, senderKey: null, originalAt: at(15, 20, 3), text: '' },
    ]);
    expect(chat.messages[2].attachment).toEqual({ path: media.photo, name: media.photo, kind: 'image' });
    expect(chat.messages[3].notice).toEqual({ code: 'mediaOmitted', detail: platform === 'ios' ? 'image' : '' });
    expect(chat.messages[5].attachment).toEqual({ path: media.voice, name: media.voice, kind: 'voice' });
    expect(chat.messages[6].notice).toEqual({ code: 'service', detail: LANGUAGES[language].added });
    expect(chat.senders).toEqual([{ key: 's-2', name: 'Bob K.', messageCount: 4 }, { key: 's-1', name: 'Anna', messageCount: 2 }]);
    expect(chat.fileCount).toBe(2);
    expect(chat.firstAt).toBe(at(14, 9, 5));
    expect(chat.lastAt).toBe(at(15, 20, 3));
  });

  it('keeps the seconds of iOS times', () => {
    const chat = parseWhatsApp('[14.03.21, 09:05:33] Anna: Hi', options());
    expect(chat.messages[0].originalAt).toBe(at(14, 9, 5, 33));
  });

  it('turns a missing attachment into a grey line with its name', () => {
    const chat = parseWhatsApp('14/03/2021, 14:08 - Bob: IMG-1.jpg (file attached)', options({ hasFile: () => false }));
    expect(chat.messages[0]).toMatchObject({ text: '', notice: { code: 'fileMissing', detail: 'IMG-1.jpg' } });
    expect(chat.messages[0].attachment).toBeUndefined();
    expect(chat.fileCount).toBe(0);
  });

  it('reads locations and polls as grey lines', () => {
    const content = [
      '14/03/2021, 14:08 - Bob: location: https://maps.google.com/?q=52.52,13.40',
      '14/03/2021, 14:09 - Anna: POLL:',
      'Where do we meet?',
      'OPTION: Park (1 vote)',
    ].join('\n');
    const chat = parseWhatsApp(content, options());
    expect(chat.messages.map((message) => message.notice)).toEqual([
      { code: 'location', detail: 'https://maps.google.com/?q=52.52,13.40' },
      { code: 'poll', detail: 'Where do we meet?' },
    ]);
  });

  it('reads contact cards as a grey line and Android audio files as audio', () => {
    const content = [
      '14/03/2021, 14:08 - Bob: Carla Ruiz.vcf (file attached)',
      '14/03/2021, 14:09 - Bob: AUD-20210314-WA0003.opus (file attached)',
      '14/03/2021, 14:10 - Bob: PTT-20210314-WA0004.opus (file attached)',
    ].join('\n');
    const chat = parseWhatsApp(content, options());
    expect(chat.messages[0]).toMatchObject({ notice: { code: 'contact', detail: 'Carla Ruiz' } });
    expect(chat.messages[0].attachment).toBeUndefined();
    expect(chat.messages.slice(1).map((message) => message.attachment?.kind)).toEqual(['audio', 'voice']);
    expect(chat.fileCount).toBe(2);
  });

  it('reads times in the chosen time zone', () => {
    const line = '[14.07.21, 09:05:33] Anna: Hi';
    expect(parseWhatsApp(line, options({ timeZone: 'Europe/Berlin' })).messages[0].originalAt).toBe('2021-07-14T07:05:33.000Z');
    const chat = parseWhatsApp(line, options({ timeZone: 'America/New_York' }));
    expect(chat.messages[0].originalAt).toBe('2021-07-14T13:05:33.000Z');
    expect(chat.timeZone).toBe('America/New_York');
  });

  it('masks phone numbers of unsaved contacts', () => {
    const chat = parseWhatsApp('[14.03.21, 09:05:33] ~ +49 151 23456789: Hi @4915123456789', options());
    expect(chat.senders[0].name).toBe('+49 ••• 789');
    expect(chat.messages[0].text).toBe('Hi @••• 789');
  });

  it('removes the tilde WhatsApp puts before unsaved numbers', () => {
    const chat = parseWhatsApp('[14.03.21, 09:05:33] ~\u202fBob: Hi', options());
    expect(chat.senders).toEqual([{ key: 's-1', name: 'Bob', messageCount: 1 }]);
  });

  it('ignores lines before the first message', () => {
    const chat = parseWhatsApp('\ufeffjunk\n14/03/2021, 14:08 - Bob: Hi', options());
    expect(chat.messages).toHaveLength(1);
  });

  it('rejects text without WhatsApp lines', () => {
    expect(() => parseWhatsApp('hello\nworld', options())).toThrow('unknownFormat');
  });

  it('reads dates with the year first', () => {
    const chat = parseWhatsApp('2021-03-04, 14:08 - Bob: Hi', options({ localeOrder: 'mdy' }));
    expect(chat.messages[0].originalAt).toBe(new Date(2021, 2, 4, 14, 8).toISOString());
    expect(chat.dateOrderCertain).toBe(true);
  });
});

describe('day and month order', () => {
  const ambiguous = ['04/03/2021, 14:08 - Bob: Hi', '05/03/2021, 09:00 - Anna: Hey'].join('\n');

  it('follows the browser locale when no value is above 12', () => {
    const dayFirst = parseWhatsApp(ambiguous, options({ localeOrder: 'dmy' }));
    const monthFirst = parseWhatsApp(ambiguous, options({ localeOrder: 'mdy' }));
    expect(dayFirst).toMatchObject({ dateOrder: 'dmy', dateOrderCertain: false });
    expect(dayFirst.messages[0].originalAt).toBe(new Date(2021, 2, 4, 14, 8).toISOString());
    expect(monthFirst).toMatchObject({ dateOrder: 'mdy', dateOrderCertain: false });
    expect(monthFirst.messages[0].originalAt).toBe(new Date(2021, 3, 3, 14, 8).toISOString());
  });

  it('uses the order the user switched to', () => {
    const chat = parseWhatsApp(ambiguous, options({ localeOrder: 'dmy', order: 'mdy' }));
    expect(chat.dateOrder).toBe('mdy');
    expect(chat.messages[1].originalAt).toBe(new Date(2021, 4, 3, 9, 0).toISOString());
  });

  it('is certain once one value is above 12', () => {
    const chat = parseWhatsApp(`${ambiguous}\n03/25/2021, 10:00 - Bob: Later`, options({ localeOrder: 'dmy' }));
    expect(chat).toMatchObject({ dateOrder: 'mdy', dateOrderCertain: true });
  });

  it('reads 12 AM as midnight and 12 PM as noon', () => {
    const line = (hour: number) => renderLine('android', 'en', 12, { day: 14, hour, minute: 30, sender: 'Bob', text: 'x' });
    const chat = parseWhatsApp([line(0), line(12)].join('\n'), options());
    expect(chat.messages.map((message) => message.originalAt)).toEqual([at(14, 0, 30), at(14, 12, 30)]);
  });
});
