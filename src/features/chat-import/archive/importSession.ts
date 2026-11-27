import type { DateOrder, ParsedChat } from '../model/types';
import { ImportParseError } from '../model/types';
import { baseName, extensionOf } from '../parsers/common';
import { isTelegramHtml, parseTelegram } from '../parsers/telegram';
import { isWhatsAppText, parseWhatsApp } from '../parsers/whatsapp';
import { dirName, filesArchive, pathResolver, zipArchive, type ExportArchive } from './exportArchive';
import { ZipError } from './zipReader';

export interface OpenOptions {
  localeOrder: DateOrder;
}

export interface ImportSession {
  chat: ParsedChat;
  reparse: (order: DateOrder, timeZone?: string) => ParsedChat;
  file: (path: string) => Promise<File>;
}

const isZip = async (file: File) => {
  if (extensionOf(file.name) === 'zip') return true;
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
};

const openArchive = async (files: readonly File[]): Promise<{ archive: ExportArchive; names: string[] }> => {
  if (files.length === 1 && await isZip(files[0])) return { archive: await zipArchive(files[0]), names: [files[0].name] };
  return { archive: filesArchive(files), names: [] };
};

const shortest = (paths: readonly string[]) => [...paths].sort((a, b) => a.length - b.length)[0];

const textOf = async (archive: ExportArchive, path: string) => new TextDecoder('utf-8').decode(await (await archive.file(path)).arrayBuffer());

const findWhatsAppText = async (archive: ExportArchive) => {
  const texts = archive.paths.filter((path) => extensionOf(path) === 'txt');
  if (texts.length <= 1) return texts[0] ?? null;
  const preferred = texts.find((path) => baseName(path) === '_chat.txt') ?? texts.find((path) => /whatsapp/i.test(baseName(path)));
  if (preferred) return preferred;
  for (const path of texts) {
    if (isWhatsAppText(await textOf(archive, path))) return path;
  }
  return null;
};

const withResolvedPaths = (chat: ParsedChat, resolve: (path: string) => string | null, archive: ExportArchive): ParsedChat => ({
  ...chat,
  messages: chat.messages.map((message) => {
    if (!message.attachment) return message;
    const path = resolve(message.attachment.path) ?? message.attachment.path;
    return { ...message, attachment: { ...message.attachment, path, size: archive.size(path) } };
  }),
});

const telegramSession = async (archive: ExportArchive, path: string): Promise<ParsedChat> => {
  let data: unknown;
  try {
    data = JSON.parse(await textOf(archive, path));
  } catch {
    throw new ImportParseError('brokenFile');
  }
  const resolve = pathResolver(archive.paths, dirName(path));
  return withResolvedPaths(parseTelegram(data, (media) => resolve(media) !== null), resolve, archive);
};

const parseFailure = (error: unknown) => (error instanceof ZipError ? new ImportParseError('brokenFile') : error);

export const openImportSession = async (files: readonly File[], options: OpenOptions): Promise<ImportSession> => {
  if (files.length === 0) throw new ImportParseError('noChatFile');
  const { archive, names } = await openArchive(files).catch((error: unknown) => { throw parseFailure(error); });
  const file = archive.file;
  const telegram = archive.paths.filter((path) => baseName(path) === 'result.json' || (archive.paths.length === 1 && extensionOf(path) === 'json'));
  if (telegram.length) {
    const chat = await telegramSession(archive, shortest(telegram));
    return { chat, reparse: () => chat, file };
  }
  if (isTelegramHtml(archive.paths)) throw new ImportParseError('telegramHtml');
  const textPath = await findWhatsAppText(archive);
  if (!textPath) throw new ImportParseError('noChatFile');
  const content = await textOf(archive, textPath);
  const resolve = pathResolver(archive.paths, dirName(textPath));
  const parse = (order?: DateOrder, timeZone?: string) => withResolvedPaths(parseWhatsApp(content, {
    fileNames: [baseName(textPath), ...names, ...files.map((item) => item.name)],
    hasFile: (name) => resolve(name) !== null,
    localeOrder: options.localeOrder,
    order,
    timeZone,
  }), resolve, archive);
  return { chat: parse(), reparse: parse, file };
};
