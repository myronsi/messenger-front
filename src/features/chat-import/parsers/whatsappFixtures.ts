export type Platform = 'ios' | 'android';
export type Language = 'en' | 'de' | 'ru' | 'es';
export type Clock = 12 | 24;

interface LanguageText {
  iosAttached: string;
  androidAttached: string;
  iosOmitted: string;
  androidOmitted: string;
  deleted: string;
  encryption: string;
  edited: string;
  added: string;
  am: string;
  pm: string;
  title: string;
}

export const LANGUAGES: Record<Language, LanguageText> = {
  en: {
    iosAttached: 'attached', androidAttached: 'file attached', iosOmitted: 'image omitted', androidOmitted: '<Media omitted>',
    deleted: 'This message was deleted.', edited: '<This message was edited>', added: 'Anna added Carla',
    encryption: 'Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.',
    am: 'AM', pm: 'PM', title: 'WhatsApp Chat with Bob K.',
  },
  de: {
    iosAttached: 'Anhang', androidAttached: 'Datei angehängt', iosOmitted: 'Bild weggelassen', androidOmitted: '<Medien ausgeschlossen>',
    deleted: 'Diese Nachricht wurde gelöscht.', edited: '<Diese Nachricht wurde bearbeitet.>', added: 'Anna hat Carla hinzugefügt.',
    encryption: 'Nachrichten und Anrufe sind Ende-zu-Ende-verschlüsselt. Niemand außerhalb dieses Chats kann sie lesen oder anhören.',
    am: 'AM', pm: 'PM', title: 'WhatsApp Chat mit Bob K.',
  },
  ru: {
    iosAttached: 'вложение', androidAttached: 'файл добавлен', iosOmitted: 'изображение отсутствует', androidOmitted: '<Без медиафайлов>',
    deleted: 'Данное сообщение удалено.', edited: '<Это сообщение было изменено>', added: 'Anna добавил(-а) Carla',
    encryption: 'Сообщения и звонки защищены сквозным шифрованием. Никто за пределами этого чата не может их прочитать или прослушать.',
    am: 'AM', pm: 'PM', title: 'Чат WhatsApp с Bob K.',
  },
  es: {
    iosAttached: 'adjunto', androidAttached: 'archivo adjunto', iosOmitted: 'imagen omitida', androidOmitted: '<Multimedia omitido>',
    deleted: 'Se eliminó este mensaje.', edited: '<Se editó este mensaje.>', added: 'Anna añadió a Carla',
    encryption: 'Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos ni escucharlos.',
    am: 'a.\u00a0m.', pm: 'p.\u00a0m.', title: 'Chat de WhatsApp con Bob K.',
  },
};

const pad = (value: number) => String(value).padStart(2, '0');

const dateText = (language: Language, clock: Clock, day: number, month: number) => {
  if (language === 'en') return clock === 12 ? `${month}/${day}/21` : `${pad(day)}/${pad(month)}/2021`;
  if (language === 'de') return `${pad(day)}.${pad(month)}.21`;
  if (language === 'ru') return `${pad(day)}.${pad(month)}.2021`;
  return `${day}/${month}/21`;
};

const timeText = (language: Language, clock: Clock, platform: Platform, hour: number, minute: number) => {
  const seconds = platform === 'ios' ? ':00' : '';
  if (clock === 24) return `${pad(hour)}:${pad(minute)}${seconds}`;
  const text = LANGUAGES[language];
  return `${hour % 12 || 12}:${pad(minute)}${seconds}\u202f${hour < 12 ? text.am : text.pm}`;
};

export interface FixtureLine {
  day: number;
  hour: number;
  minute: number;
  sender: string | null;
  text: string;
  marked?: boolean;
}

export const header = (platform: Platform, language: Language, clock: Clock, line: Pick<FixtureLine, 'day' | 'hour' | 'minute'>) => {
  const date = dateText(language, clock, line.day, 3);
  const time = timeText(language, clock, platform, line.hour, line.minute);
  return platform === 'ios' ? `[${date}, ${time}] ` : `${date}, ${time} - `;
};

export const renderLine = (platform: Platform, language: Language, clock: Clock, line: FixtureLine) => {
  const mark = line.marked && platform === 'ios' ? '\u200e' : '';
  const sender = line.sender ? `${line.sender}: ` : '';
  return `${mark}${header(platform, language, clock, line)}${sender}${mark}${line.text}`;
};

export const sampleChat = (platform: Platform, language: Language, clock: Clock) => {
  const text = LANGUAGES[language];
  const ios = platform === 'ios';
  const lines: FixtureLine[] = [
    { day: 14, hour: 9, minute: 5, sender: ios ? 'Bob K.' : null, text: text.encryption, marked: true },
    { day: 14, hour: 9, minute: 5, sender: 'Anna', text: 'Hello Bob' },
    { day: 14, hour: 14, minute: 7, sender: 'Bob K.', text: 'Hi!\nsecond line\n\nthird line' },
    {
      day: 14, hour: 14, minute: 8, sender: 'Bob K.', marked: true,
      text: ios ? `<${text.iosAttached}: 00000003-PHOTO-2021-03-14-14-08-10.jpg>` : `IMG-20210314-WA0001.jpg (${text.androidAttached})\nLook at this`,
    },
    { day: 14, hour: 14, minute: 9, sender: 'Anna', text: ios ? text.iosOmitted : text.androidOmitted, marked: true },
    { day: 15, hour: 8, minute: 0, sender: 'Anna', text: text.deleted, marked: true },
    { day: 15, hour: 8, minute: 1, sender: 'Bob K.', text: `Fixed typo ${text.edited}` },
    {
      day: 15, hour: 8, minute: 2, sender: 'Bob K.', marked: true,
      text: ios ? `<${text.iosAttached}: 00000004-AUDIO-2021-03-15-08-02-00.opus>` : `PTT-20210315-WA0002.opus (${text.androidAttached})`,
    },
    { day: 15, hour: 20, minute: 3, sender: ios ? 'Trip' : null, text: text.added, marked: true },
  ];
  return lines.map((line) => renderLine(platform, language, clock, line)).join(platform === 'ios' ? '\r\n' : '\n');
};

export const MEDIA = {
  ios: { photo: '00000003-PHOTO-2021-03-14-14-08-10.jpg', voice: '00000004-AUDIO-2021-03-15-08-02-00.opus' },
  android: { photo: 'IMG-20210314-WA0001.jpg', voice: 'PTT-20210315-WA0002.opus' },
};
