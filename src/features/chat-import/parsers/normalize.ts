import { MAX_IMPORT_FILES, type ParsedMessage } from '../model/types';

export const MAX_TEXT_LENGTH = 4096;
const PHONE_NAME = /^\+?[\d\s()\u00a0\u202f.-]{7,}$/;
const PHONE_MENTION = /@\+?\d{7,15}\b/g;
const COUNTRY = /^\+\d{1,3}(?=[\s(.-])/;
const HIGH_SURROGATE = /[\uD800-\uDBFF]/;

const maskedDigits = (digits: string, prefix: string) => `${prefix ? `${prefix} ` : ''}••• ${digits.slice(-3)}`;

export const maskPhone = (name: string) => {
  const trimmed = name.trim();
  if (!PHONE_NAME.test(trimmed)) return name;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return name;
  return maskedDigits(digits, trimmed.startsWith('+') ? COUNTRY.exec(trimmed)?.[0] ?? '+' : '');
};

export const maskPhoneMentions = (text: string) => text.replace(PHONE_MENTION, (mention) => `@${maskedDigits(mention.replace(/\D/g, ''), '')}`);

export const splitText = (text: string, max = MAX_TEXT_LENGTH) => {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = Math.max(rest.lastIndexOf('\n', max), rest.lastIndexOf(' ', max));
    if (cut < max / 2) cut = max;
    if (HIGH_SURROGATE.test(rest[cut - 1])) cut -= 1;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest || parts.length === 0) parts.push(rest);
  return parts;
};

export const splitLongMessages = (messages: readonly ParsedMessage[]) => {
  const out: ParsedMessage[] = [];
  const moved = new Map<number, number>();
  for (const message of messages) {
    moved.set(message.index, out.length);
    if (message.notice || message.text.length <= MAX_TEXT_LENGTH) {
      out.push(message);
      continue;
    }
    const [first, ...rest] = splitText(message.text);
    out.push({ ...message, text: first });
    for (const text of rest) out.push({ index: 0, senderKey: message.senderKey, originalAt: message.originalAt, text });
  }
  return out.map((message, index) => {
    const reply = message.replyToIndex === undefined ? undefined : moved.get(message.replyToIndex);
    const { replyToIndex: _old, ...rest } = message;
    return reply === undefined ? { ...rest, index } : { ...rest, index, replyToIndex: reply };
  });
};

export const limitFiles = (messages: ParsedMessage[], limit = MAX_IMPORT_FILES) => {
  const kept = new Set<string>();
  const dropped = new Set<string>();
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const path = messages[i].attachment?.path;
    if (path === undefined || kept.has(path) || dropped.has(path)) continue;
    (kept.size < limit ? kept : dropped).add(path);
  }
  if (dropped.size > 0) {
    for (const message of messages) {
      const attachment = message.attachment;
      if (!attachment || !dropped.has(attachment.path)) continue;
      delete message.attachment;
      message.notice = { code: 'fileOverLimit', detail: attachment.name };
    }
  }
  return { fileCount: kept.size, skippedFiles: dropped.size };
};
