import type { DateOrder, ParsedChat, ParsedMessage } from '../model/types';
import { ImportParseError } from '../model/types';
import { baseName, buildChat, cleanName, kindFromName, stripInvisible } from './common';
import { guessDateOrder, lineDate, scanLines, type RawLine } from './whatsappLines';
import {
  ANDROID_ATTACHMENT, DELETED, EDITED_SUFFIX, ENCRYPTION_NOTICE, ENCRYPTION_START, IOS_ATTACHMENT, LOCATION, POLL, omittedKind, titleFromFileName,
} from './whatsappPatterns';

export type HasFile = (name: string) => boolean;

export interface WhatsAppOptions {
  fileNames: readonly string[];
  hasFile: HasFile;
  localeOrder: DateOrder;
  order?: DateOrder;
}

type Body = Omit<ParsedMessage, 'index' | 'originalAt' | 'senderKey'> | null;

const systemBody = (text: string): Body => (ENCRYPTION_NOTICE.test(text) || !text ? null : { text: '', notice: { code: 'service', detail: text } });

const attachmentBody = (name: string, caption: string, hasFile: HasFile): Body => {
  const fileName = baseName(name.trim());
  if (!hasFile(fileName)) return { text: caption, notice: { code: 'fileMissing', detail: fileName } };
  return { text: caption, attachment: { path: fileName, name: fileName, kind: kindFromName(fileName) } };
};

const messageBody = (raw: string, hasFile: HasFile): Body => {
  const marked = raw.startsWith('\u200e');
  const text = stripInvisible(raw).replace(EDITED_SUFFIX, '').trim();
  if (!text || DELETED.test(text) || ENCRYPTION_START.test(text)) return null;
  const ios = IOS_ATTACHMENT.exec(text);
  if (ios) return attachmentBody(ios[1], text.slice(ios[0].length).trim(), hasFile);
  const [firstLine, ...rest] = text.split('\n');
  const android = ANDROID_ATTACHMENT.exec(firstLine.trim());
  if (android) return attachmentBody(android[1], rest.join('\n').trim(), hasFile);
  const omitted = omittedKind(text, marked);
  if (omitted !== null) return { text: '', notice: { code: 'mediaOmitted', detail: omitted } };
  const location = LOCATION.exec(text);
  if (location) return { text: '', notice: { code: 'location', detail: location[1] } };
  const poll = POLL.exec(text);
  if (poll) return { text: '', notice: { code: 'poll', detail: poll[1].trim() } };
  if (marked) return systemBody(text);
  return { text };
};

const bodyOf = (line: RawLine, hasFile: HasFile): Body => {
  if (!line.sender) return systemBody(stripInvisible(line.text).trim());
  return messageBody(line.text, hasFile);
};

const pickTitle = (fileNames: readonly string[], senders: ParsedChat['senders']) => {
  for (const name of fileNames) {
    const title = titleFromFileName(baseName(name));
    if (title) return title;
  }
  return senders.length === 2 ? senders.map((sender) => sender.name).join(' & ') : 'WhatsApp';
};

export const parseWhatsApp = (content: string, options: WhatsAppOptions): ParsedChat => {
  const lines = scanLines(content);
  if (lines.length === 0) throw new ImportParseError('unknownFormat');
  const guess = guessDateOrder(lines, options.localeOrder);
  const order = options.order ?? guess.order;
  const messages: ParsedMessage[] = [];
  for (const line of lines) {
    const originalAt = lineDate(line, order);
    const body = originalAt ? bodyOf(line, options.hasFile) : null;
    if (!originalAt || !body) continue;
    const isSystem = !line.sender || (body.notice?.code === 'service');
    const senderKey = isSystem ? null : cleanName(line.sender ?? '');
    messages.push({ index: messages.length, senderKey: senderKey || null, originalAt, ...body });
  }
  const chat = buildChat({ source: 'whatsapp', title: 'WhatsApp', messages });
  return { ...chat, title: pickTitle(options.fileNames, chat.senders), dateOrder: order, dateOrderCertain: guess.certain };
};

export const isWhatsAppText = (content: string) => scanLines(content.slice(0, 4096)).length > 0;
