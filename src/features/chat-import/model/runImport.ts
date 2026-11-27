import type { EntityId } from '@/shared/api/entityId';
import { importCalls } from '../api/importApi';
import { importStickerCalls } from '../api/importStickerCalls';
import type { ChatImport } from '../api/importTypes';
import { errorStatus } from './importErrors';
import { importedMessage, type SkipReason } from './importRequest';
import { addImportSticker, FILE_HASH_KEY, fileDigest, STICKER_HASH_KEY, STICKER_KEY, type StickerCalls } from './importStickers';
import { precheck, uploadImportFile } from './uploadImportFile';
import { IMPORT_BATCH_SIZE, type ParsedAttachment, type ParsedChat, type ParsedNotice } from './types';

export interface ImportProgress {
  phase: 'files' | 'messages' | 'finishing';
  done: number;
  total: number;
}

export interface RunDeps {
  calls: Pick<typeof importCalls, 'addMessages' | 'finish' | 'get'>;
  upload: typeof uploadImportFile;
  readFile: (path: string) => Promise<File>;
  wait: (ms: number) => Promise<void>;
  stickers?: StickerCalls;
}

export interface RunOptions {
  importId: EntityId;
  chat: ParsedChat;
  fromIndex: number;
  uploaded: Record<string, EntityId>;
  noticeText: (notice: ParsedNotice) => string;
  stickerPackTitle?: string;
  onProgress: (progress: ImportProgress) => void;
  onUploaded: (uploaded: Record<string, EntityId>) => void;
  signal?: AbortSignal;
}

export class ImportRunError extends Error {
  constructor(readonly code: 'stopped' | 'cancelled') {
    super(code);
  }
}

const SAVE_EVERY = 20;
const RETRIES = 2;

const pendingAttachments = (chat: ParsedChat, fromIndex: number) => {
  const byPath = new Map<string, ParsedAttachment>();
  for (const message of chat.messages.slice(fromIndex)) {
    if (message.attachment && !byPath.has(message.attachment.path)) byPath.set(message.attachment.path, message.attachment);
  }
  return [...byPath.values()];
};

const retryable = (error: unknown) => {
  const status = errorStatus(error);
  return status === 'FETCH_ERROR' || (typeof status === 'number' && status >= 500);
};

const checkAbort = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ImportRunError('cancelled');
};

const placed = (ids: Map<string, EntityId>, path: string) => ids.has(path) || ids.has(STICKER_KEY + path);

const captioned = new WeakMap<ParsedChat, Set<string>>();

const captionedPaths = (chat: ParsedChat) => {
  let paths = captioned.get(chat);
  if (!paths) {
    paths = new Set(chat.messages.flatMap((message) => (message.attachment && message.text ? [message.attachment.path] : [])));
    captioned.set(chat, paths);
  }
  return paths;
};

const placeSticker = async (file: File, attachment: ParsedAttachment, hash: string | null, ids: Map<string, EntityId>, options: RunOptions, deps: RunDeps) => {
  if (attachment.kind !== 'sticker' || !deps.stickers || !options.stickerPackTitle || captionedPaths(options.chat).has(attachment.path)) return false;
  const known = hash === null ? undefined : ids.get(STICKER_HASH_KEY + hash);
  const sticker = known ?? await addImportSticker(file, attachment, ids, options.stickerPackTitle, deps.stickers, options.signal);
  if (sticker === null) return false;
  ids.set(STICKER_KEY + attachment.path, sticker);
  if (hash !== null) ids.set(STICKER_HASH_KEY + hash, sticker);
  return true;
};

const placeFile = async (attachment: ParsedAttachment, ids: Map<string, EntityId>, skipped: Map<string, SkipReason>, options: RunOptions, deps: RunDeps) => {
  const file = await deps.readFile(attachment.path);
  const hash = await fileDigest(file);
  if (await placeSticker(file, attachment, hash, ids, options, deps)) return;
  const known = hash === null ? undefined : ids.get(FILE_HASH_KEY + hash);
  if (known !== undefined) {
    ids.set(attachment.path, known);
    return;
  }
  const outcome = await deps.upload(file, attachment, options.importId, options.signal);
  if ('skipped' in outcome) {
    skipped.set(attachment.path, outcome.skipped);
    return;
  }
  ids.set(attachment.path, outcome.id);
  if (hash !== null) ids.set(FILE_HASH_KEY + hash, outcome.id);
};

const uploadFiles = async (options: RunOptions, deps: RunDeps) => {
  const ids = new Map(Object.entries(options.uploaded));
  const skipped = new Map<string, SkipReason>();
  const attachments = pendingAttachments(options.chat, options.fromIndex);
  let sinceSave = 0;
  options.onProgress({ phase: 'files', done: 0, total: attachments.length });
  for (const [position, attachment] of attachments.entries()) {
    checkAbort(options.signal);
    const reason = placed(ids, attachment.path) ? null : precheck(attachment);
    if (reason) skipped.set(attachment.path, reason);
    else if (!placed(ids, attachment.path)) {
      await placeFile(attachment, ids, skipped, options, deps)
        .catch((error: unknown) => { throw options.signal?.aborted ? new ImportRunError('cancelled') : error; });
      sinceSave += 1;
      if (sinceSave >= SAVE_EVERY) {
        sinceSave = 0;
        options.onUploaded(Object.fromEntries(ids));
      }
    }
    options.onProgress({ phase: 'files', done: position + 1, total: attachments.length });
  }
  options.onUploaded(Object.fromEntries(ids));
  return { ids, skipped };
};

const sendBatches = async (options: RunOptions, deps: RunDeps, ids: Map<string, EntityId>, skipped: Map<string, SkipReason>) => {
  const total = options.chat.messages.length;
  const context = { attachmentIds: ids, skipped, noticeText: options.noticeText };
  let index = options.fromIndex;
  let failures = 0;
  options.onProgress({ phase: 'messages', done: index, total });
  while (index < total) {
    checkAbort(options.signal);
    const messages = options.chat.messages.slice(index, index + IMPORT_BATCH_SIZE).map((message) => importedMessage(message, context));
    const result = await deps.calls.addMessages(options.importId, { from_index: index, messages }, options.signal);
    if (!result.error) {
      failures = 0;
      index = Math.max(result.data.next_index, index + 1);
    } else if (errorStatus(result.error) === 409 && failures < RETRIES) {
      failures += 1;
      const current = await deps.calls.get(options.importId, options.signal);
      if (current.error) throw new ImportRunError('stopped');
      index = current.data.next_index;
    } else if (retryable(result.error) && failures < RETRIES) {
      failures += 1;
      await deps.wait(1000 * failures);
    } else {
      checkAbort(options.signal);
      throw new ImportRunError('stopped');
    }
    options.onProgress({ phase: 'messages', done: Math.min(index, total), total });
  }
};

const defaultDeps = (readFile: RunDeps['readFile']): RunDeps => ({
  calls: importCalls,
  upload: uploadImportFile,
  readFile,
  stickers: importStickerCalls,
  wait: (ms) => new Promise((resolve) => { setTimeout(resolve, ms); }),
});

export const runImport = async (options: RunOptions, deps: RunDeps | RunDeps['readFile']): Promise<ChatImport> => {
  const resolved = typeof deps === 'function' ? defaultDeps(deps) : deps;
  const { ids, skipped } = await uploadFiles(options, resolved);
  await sendBatches(options, resolved, ids, skipped);
  options.onProgress({ phase: 'finishing', done: options.chat.messages.length, total: options.chat.messages.length });
  const finished = await resolved.calls.finish(options.importId);
  if (finished.error) throw new ImportRunError('stopped');
  return finished.data;
};
