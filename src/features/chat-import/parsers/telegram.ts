import type { AttachmentKind, ParsedChat, ParsedMessage, ParsedNotice } from '../model/types';
import { ImportParseError } from '../model/types';
import { baseName, buildChat, extensionOf } from './common';

interface TelegramTextPart {
  type?: string;
  text?: string;
  href?: string;
}

type TelegramText = string | Array<string | TelegramTextPart>;

interface TelegramMessage {
  id?: number;
  type?: string;
  date?: string;
  date_unixtime?: string;
  from?: string | null;
  from_id?: string;
  actor?: string | null;
  action?: string;
  title?: string;
  members?: Array<string | null>;
  text?: TelegramText;
  text_entities?: TelegramTextPart[];
  reply_to_message_id?: number;
  forwarded_from?: string | null;
  photo?: string;
  file?: string;
  file_name?: string;
  media_type?: string;
  sticker_emoji?: string;
  poll?: { question?: string };
  location_information?: { latitude?: number; longitude?: number };
  place_name?: string;
  contact_information?: { first_name?: string; last_name?: string; phone_number?: string };
  duration_seconds?: number;
}

interface TelegramExport {
  name?: string | null;
  type?: string;
  messages?: TelegramMessage[];
  chats?: unknown;
}

export type HasFile = (path: string) => boolean;

const DELETED_ACCOUNT = 'Deleted Account';

const partText = (part: string | TelegramTextPart) => {
  if (typeof part === 'string') return part;
  const text = part.text ?? '';
  return part.type === 'text_link' && part.href && part.href !== text ? `${text} (${part.href})` : text;
};

export const telegramText = (message: Pick<TelegramMessage, 'text' | 'text_entities'>) => {
  if (Array.isArray(message.text_entities) && message.text_entities.length) return message.text_entities.map(partText).join('');
  if (Array.isArray(message.text)) return message.text.map(partText).join('');
  return typeof message.text === 'string' ? message.text : '';
};

const dateOf = (message: TelegramMessage) => {
  const unix = Number(message.date_unixtime);
  const date = Number.isFinite(unix) && message.date_unixtime ? new Date(unix * 1000) : new Date(message.date ?? '');
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const MEDIA_KINDS: Record<string, AttachmentKind> = {
  voice_message: 'voice', video_message: 'video', video_file: 'video', animation: 'video', audio_file: 'audio', sticker: 'sticker',
};

const included = (path: string | undefined, hasFile: HasFile): path is string => !!path && !path.startsWith('(') && hasFile(path);

interface MediaResult {
  attachment?: ParsedMessage['attachment'];
  notice?: ParsedNotice;
}

const mediaOf = (message: TelegramMessage, hasFile: HasFile): MediaResult => {
  if (message.photo) {
    return included(message.photo, hasFile)
      ? { attachment: { path: message.photo, name: baseName(message.photo), kind: 'image' } }
      : { notice: { code: 'mediaOmitted', detail: 'image' } };
  }
  if (message.media_type === 'sticker' && (!included(message.file, hasFile) || extensionOf(message.file) === 'tgs')) {
    return { notice: { code: 'sticker', detail: message.sticker_emoji ?? '' } };
  }
  if (message.file === undefined) return {};
  const kind = (message.media_type && MEDIA_KINDS[message.media_type]) || 'file';
  const sticker = kind === 'sticker' && extensionOf(message.file) !== 'webp' ? 'video' : kind;
  return included(message.file, hasFile)
    ? { attachment: { path: message.file, name: message.file_name || baseName(message.file), kind: sticker } }
    : { notice: { code: 'mediaOmitted', detail: message.file_name || sticker } };
};

const richNotice = (message: TelegramMessage): ParsedNotice | undefined => {
  if (message.poll) return { code: 'poll', detail: message.poll.question ?? '' };
  if (message.location_information) {
    const { latitude, longitude } = message.location_information;
    return { code: 'location', detail: message.place_name || `${latitude ?? ''}, ${longitude ?? ''}` };
  }
  if (message.contact_information) {
    const { first_name: first = '', last_name: last = '', phone_number: phone = '' } = message.contact_information;
    return { code: 'contact', detail: `${first} ${last}`.trim() || phone };
  }
  return undefined;
};

const names = (members: TelegramMessage['members']) => (members ?? []).map((member) => member || DELETED_ACCOUNT).join(', ');

const serviceNotice = (message: TelegramMessage): ParsedNotice | undefined => {
  const actor = message.actor || DELETED_ACCOUNT;
  switch (message.action) {
    case 'create_group':
    case 'create_channel':
      return { code: 'groupCreated', actor, detail: message.title ?? '' };
    case 'invite_members':
      return { code: 'membersAdded', actor, detail: names(message.members) };
    case 'remove_members':
      return { code: 'membersRemoved', actor, detail: names(message.members) };
    case 'join_group_by_link':
    case 'join_group_by_request':
      return { code: 'memberJoined', actor, detail: '' };
    case 'pin_message':
      return { code: 'messagePinned', actor, detail: '' };
    case 'edit_group_title':
      return { code: 'titleChanged', actor, detail: message.title ?? '' };
    case 'edit_group_photo':
      return { code: 'photoChanged', actor, detail: '' };
    case 'phone_call':
    case 'group_call':
      return { code: 'call', actor, detail: message.duration_seconds ? String(message.duration_seconds) : '' };
    default:
      return undefined;
  }
};

const senderOf = (message: TelegramMessage) => {
  const name = message.from || DELETED_ACCOUNT;
  return { key: message.from_id || `name:${name}`, name };
};

const isExport = (data: unknown): data is TelegramExport => !!data && typeof data === 'object' && !Array.isArray(data);

export const parseTelegram = (data: unknown, hasFile: HasFile): ParsedChat => {
  if (!isExport(data)) throw new ImportParseError('unknownFormat');
  if (data.chats && !Array.isArray(data.messages)) throw new ImportParseError('telegramAccountExport');
  if (!Array.isArray(data.messages)) throw new ImportParseError('unknownFormat');
  const messages: ParsedMessage[] = [];
  const senderNames = new Map<string, string>();
  const indexById = new Map<number, number>();
  const replies: Array<[ParsedMessage, number]> = [];
  for (const message of data.messages) {
    const originalAt = dateOf(message);
    if (!originalAt) continue;
    const index = messages.length;
    if (message.type === 'service') {
      const notice = serviceNotice(message);
      if (notice) messages.push({ index, senderKey: null, originalAt, text: '', notice });
      continue;
    }
    if (message.type !== 'message') continue;
    const sender = senderOf(message);
    senderNames.set(sender.key, sender.name);
    const text = telegramText(message);
    const media = mediaOf(message, hasFile);
    const notice = richNotice(message) ?? (text || media.attachment ? undefined : media.notice);
    if (!text && !media.attachment && !notice) continue;
    const parsed: ParsedMessage = { index, senderKey: sender.key, originalAt, text, ...(media.attachment ? { attachment: media.attachment } : {}) };
    if (notice) parsed.notice = notice;
    if (message.forwarded_from) parsed.forwardedFromName = message.forwarded_from;
    if (typeof message.reply_to_message_id === 'number') replies.push([parsed, message.reply_to_message_id]);
    if (typeof message.id === 'number') indexById.set(message.id, index);
    messages.push(parsed);
  }
  for (const [message, replyId] of replies) {
    const target = indexById.get(replyId);
    if (target !== undefined && target !== message.index) message.replyToIndex = target;
  }
  const title = data.type === 'saved_messages' || !data.name ? 'Telegram' : data.name;
  return buildChat({ source: 'telegram', title, messages, names: senderNames });
};

export const isTelegramHtml = (paths: readonly string[]) => (
  !paths.some((path) => baseName(path) === 'result.json') && paths.some((path) => /^messages\d*\.html$/.test(baseName(path)))
);
