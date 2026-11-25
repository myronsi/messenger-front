import type { AttachmentKind } from '../model/types';

export const ENCRYPTION_NOTICE = new RegExp([
  'end-to-end encrypted', 'end-to-end encryption', 'Ende-zu-Ende-verschlüsselt', 'Ende-zu-Ende-Verschlüsselung',
  'сквозным шифрованием', 'de extremo a extremo',
].join('|'), 'iu');

export const ENCRYPTION_START = new RegExp(`^(?:${[
  'Messages and calls are end-to-end encrypted', 'Messages to this (?:group|chat) are now secured with end-to-end encryption',
  'Nachrichten und Anrufe sind Ende-zu-Ende-verschlüsselt', 'Сообщения и звонки защищены сквозным шифрованием',
  'Los mensajes y las llamadas están cifrados de extremo a extremo',
].join('|')})`, 'iu');

export const DELETED = new RegExp(`^(?:${[
  'This message was deleted', 'You deleted this message', 'Diese Nachricht wurde gelöscht', 'Du hast diese Nachricht gelöscht',
  'Данное сообщение удалено', 'Вы удалили данное сообщение', 'Это сообщение удалено', 'Se eliminó este mensaje', 'Eliminaste este mensaje',
  'Este mensaje fue eliminado',
].join('|')})\\.?$`, 'iu');

export const EDITED_SUFFIX = new RegExp(`[\\s\\u200e]*<(?:${[
  'This message was edited', 'Diese Nachricht wurde bearbeitet', 'Это сообщение было изменено', 'Сообщение изменено', 'Se editó este mensaje',
].join('|')})\\.?>$`, 'iu');

export const IOS_ATTACHMENT = /^<(?:attached|Anhang|вложение|adjunto|archivo adjunto):\s*([^>]+)>\s*/iu;

export const ANDROID_ATTACHMENT = /^(.+?)\s\((?:file attached|Datei angehängt|файл добавлен|archivo adjunto)\)$/iu;

export const ANDROID_OMITTED = /^<(?:Media omitted|Medien ausgeschlossen|Medien weggelassen|Без медиафайлов|Multimedia omitido|Archivo omitido)>$/iu;

const OMITTED_WORDS: Record<string, AttachmentKind> = {
  image: 'image', bild: 'image', изображение: 'image', imagen: 'image',
  video: 'video', vídeo: 'video', видео: 'video', gif: 'video',
  audio: 'voice', аудиофайл: 'voice', аудио: 'voice',
  sticker: 'sticker', стикер: 'sticker',
  document: 'file', dokument: 'file', документ: 'file', documento: 'file',
};

const IOS_OMITTED = /(?:^|\s)(\p{L}+)\s(?:omitted|weggelassen|отсутствует|omitid[oa])$/iu;

export const omittedKind = (text: string, marked: boolean): AttachmentKind | '' | null => {
  if (ANDROID_OMITTED.test(text)) return '';
  const match = marked ? IOS_OMITTED.exec(text) : null;
  if (!match) return null;
  return OMITTED_WORDS[match[1].toLowerCase()] ?? null;
};

export const LOCATION = /^(?:location|Standort|местонахождение|геопозиция|ubicación):\s*(https?:\/\/\S+)/iu;

export const POLL = /^(?:POLL|UMFRAGE|ОПРОС|ENCUESTA):\s*\n(.+)/iu;

const TITLE_PATTERNS = [
  /^WhatsApp[\s-]+Chat\s+(?:with|mit|-)\s+(.+)$/iu,
  /^Чат\s+WhatsApp\s+(?:с|-)\s+(.+)$/iu,
  /^Chat\s+de\s+WhatsApp\s+(?:con|-)\s+(.+)$/iu,
];

export const titleFromFileName = (fileName: string) => {
  const stem = fileName.replace(/\.(txt|zip)$/i, '').trim();
  for (const pattern of TITLE_PATTERNS) {
    const match = pattern.exec(stem);
    if (match) return match[1].trim();
  }
  return null;
};
