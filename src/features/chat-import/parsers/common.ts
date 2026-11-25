import type { AttachmentKind, DateOrder, ImportSource, ParsedChat, ParsedMessage, ParsedSender } from '../model/types';
import { ImportParseError } from '../model/types';

const EXTENSION_KINDS: Record<string, AttachmentKind> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', heic: 'image', bmp: 'image',
  webp: 'sticker',
  mp4: 'video', mov: 'video', webm: 'video', '3gp': 'video', mkv: 'video',
  opus: 'voice', ogg: 'voice', oga: 'voice',
  mp3: 'audio', m4a: 'audio', aac: 'audio', wav: 'audio', flac: 'audio', amr: 'audio',
};

export const extensionOf = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
};

export const baseName = (path: string) => path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1);

export const kindFromName = (name: string): AttachmentKind => EXTENSION_KINDS[extensionOf(name)] ?? 'file';

const INVISIBLE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

export const stripInvisible = (text: string) => text.replace(INVISIBLE, '');

export const cleanName = (name: string) => stripInvisible(name).replace(/^~[\s\u202f\u00a0]*/, '').trim();

export interface SenderTally {
  add: (key: string, name: string) => void;
  list: () => ParsedSender[];
}

export const senderTally = (): SenderTally => {
  const senders = new Map<string, ParsedSender>();
  return {
    add: (key, name) => {
      const current = senders.get(key);
      if (current) {
        current.messageCount += 1;
        if (!current.name && name) current.name = name;
      } else senders.set(key, { key, name, messageCount: 1 });
    },
    list: () => [...senders.values()].sort((a, b) => b.messageCount - a.messageCount || a.name.localeCompare(b.name)),
  };
};

interface ChatParts {
  source: ImportSource;
  title: string;
  messages: ParsedMessage[];
  names?: ReadonlyMap<string, string>;
}

const SAFE_KEY = /^[A-Za-z0-9_-]{1,64}$/;

export const safeSenderKeys = (source: ImportSource, keys: Iterable<string>) => {
  const safe = new Map<string, string>();
  for (const key of keys) {
    if (!safe.has(key)) safe.set(key, source === 'telegram' && SAFE_KEY.test(key) ? key : `s-${safe.size + 1}`);
  }
  return safe;
};

export const buildChat = ({ source, title, messages, names = new Map() }: ChatParts, extra: Partial<ParsedChat> = {}): ParsedChat => {
  if (messages.length === 0) throw new ImportParseError('emptyChat');
  const tally = senderTally();
  const keys = safeSenderKeys(source, messages.flatMap((message) => (message.senderKey ? [message.senderKey] : [])));
  let first: string | null = null;
  let last: string | null = null;
  let files = 0;
  for (const message of messages) {
    const raw = message.senderKey;
    if (raw) {
      message.senderKey = keys.get(raw) ?? raw;
      tally.add(message.senderKey, names.get(raw) ?? raw);
    }
    if (message.attachment) files += 1;
    if (!first || message.originalAt < first) first = message.originalAt;
    if (!last || message.originalAt > last) last = message.originalAt;
  }
  return { ...extra, source, title, messages, senders: tally.list(), fileCount: files, firstAt: first, lastAt: last };
};

export const localeDateOrder = (locale?: string): DateOrder => {
  const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date(2021, 2, 12));
  const day = parts.findIndex((part) => part.type === 'day');
  const month = parts.findIndex((part) => part.type === 'month');
  return month >= 0 && day > month ? 'mdy' : 'dmy';
};
