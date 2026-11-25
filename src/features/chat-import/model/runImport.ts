import type { EntityId } from '@/shared/api/entityId';
import { problemCode } from '@/shared/api/problem';
import { importCalls } from '../api/importApi';
import { errorStatus } from '../api/importFetch';
import type { ChatImport } from '../api/importTypes';
import { importedMessage, type SkipReason } from './importRequest';
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
}

export interface RunOptions {
  importId: EntityId;
  chat: ParsedChat;
  fromIndex: number;
  uploaded: Record<string, EntityId>;
  noticeText: (notice: ParsedNotice) => string;
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

const uploadFiles = async (options: RunOptions, deps: RunDeps) => {
  const ids = new Map(Object.entries(options.uploaded));
  const skipped = new Map<string, SkipReason>();
  const attachments = pendingAttachments(options.chat, options.fromIndex);
  let sinceSave = 0;
  options.onProgress({ phase: 'files', done: 0, total: attachments.length });
  for (const [position, attachment] of attachments.entries()) {
    checkAbort(options.signal);
    const reason = ids.has(attachment.path) ? null : precheck(attachment);
    if (reason) skipped.set(attachment.path, reason);
    else if (!ids.has(attachment.path)) {
      const outcome = await deps.upload(await deps.readFile(attachment.path), attachment, options.importId, options.signal)
        .catch((error: unknown) => { throw options.signal?.aborted ? new ImportRunError('cancelled') : error; });
      if ('id' in outcome) ids.set(attachment.path, outcome.id);
      else skipped.set(attachment.path, outcome.skipped);
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
    } else if (errorStatus(result.error) === 409 && problemCode(result.error) === 'index_gap' && failures < RETRIES) {
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
