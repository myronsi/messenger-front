import type { EntityId } from '@/shared/api/entityId';
import { importCalls } from '../api/importApi';
import { importStickerCalls } from '../api/importStickerCalls';
import type { ChatImport } from '../api/importTypes';
import { createImportFiles } from './importFiles';
import { errorStatus } from './importErrors';
import { importedMessage } from './importRequest';
import type { StickerCalls } from './importStickers';
import { uploadImportFile } from './uploadImportFile';
import { isTransient, MAX_RETRIES, retryDelay } from './uploadRetry';
import { IMPORT_BATCH_SIZE, type ParsedChat, type ParsedNotice } from './types';

export interface ImportProgress {
  phase: 'importing' | 'finishing';
  done: number;
  total: number;
  filesDone: number;
  filesTotal: number;
  waitingSeconds: number;
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

const RETRIES = 2;

const defaultDeps = (readFile: RunDeps['readFile']): RunDeps => ({
  calls: importCalls,
  upload: uploadImportFile,
  readFile,
  stickers: importStickerCalls,
  wait: (ms) => new Promise((resolve) => { setTimeout(resolve, ms); }),
});

export const runImport = async (options: RunOptions, deps: RunDeps | RunDeps['readFile']): Promise<ChatImport> => {
  const resolved = typeof deps === 'function' ? defaultDeps(deps) : deps;
  const checkAbort = () => {
    if (options.signal?.aborted) throw new ImportRunError('cancelled');
  };
  const total = options.chat.messages.length;
  let index = options.fromIndex;
  let failures = 0;
  let transient = 0;
  let waitingSeconds = 0;
  let report: (phase?: ImportProgress['phase']) => void = () => undefined;
  const onWait = (seconds: number) => {
    waitingSeconds = seconds;
    report();
  };
  const files = createImportFiles({ ...options, onWait }, resolved);
  const context = { attachmentIds: files.ids, skipped: files.skipped, noticeText: options.noticeText };
  const retry = { wait: resolved.wait, signal: options.signal, onWait };
  report = (phase = 'importing') => options.onProgress({
    phase, done: Math.min(index, total), total, filesDone: files.done(), filesTotal: files.total, waitingSeconds,
  });
  const windowAt = (from: number) => options.chat.messages.slice(from, from + IMPORT_BATCH_SIZE);
  const startPlacing = (from: number) => ({
    from,
    failure: files.place(windowAt(from), () => report(), checkAbort).then(() => null, (error: unknown) => error),
  });
  let placing: ReturnType<typeof startPlacing> | null = null;
  report();
  while (index < total) {
    checkAbort();
    if (placing && placing.from !== index) {
      await placing.failure;
      placing = null;
    }
    placing ??= startPlacing(index);
    const failure = await placing.failure;
    placing = null;
    if (failure) throw options.signal?.aborted ? new ImportRunError('cancelled') : failure;
    files.save();
    const window = windowAt(index);
    const messages = window.map((message) => importedMessage(message, context));
    const following = index + window.length;
    if (following < total) placing = startPlacing(following);
    const result = await resolved.calls.addMessages(options.importId, { from_index: index, messages }, options.signal);
    if (!result.error) {
      failures = 0;
      transient = 0;
      index = Math.max(result.data.next_index, index + 1);
    } else if (errorStatus(result.error) === 409 && failures < RETRIES) {
      failures += 1;
      const current = await resolved.calls.get(options.importId, options.signal);
      if (current.error) throw new ImportRunError('stopped');
      index = current.data.next_index;
    } else if (isTransient(result.error) && transient < MAX_RETRIES) {
      await retryDelay(retry, transient, result.error).catch(() => checkAbort());
      transient += 1;
    } else {
      checkAbort();
      throw new ImportRunError('stopped');
    }
    report();
  }
  report('finishing');
  const finished = await resolved.calls.finish(options.importId);
  if (finished.error) throw new ImportRunError('stopped');
  return finished.data;
};
