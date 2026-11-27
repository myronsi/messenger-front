import type { EntityId } from '@/shared/api/entityId';
import { importCalls } from '../api/importApi';
import { importStickerCalls } from '../api/importStickerCalls';
import type { ChatImport } from '../api/importTypes';
import { createImportFiles } from './importFiles';
import { errorStatus } from './importErrors';
import { importedMessage } from './importRequest';
import type { StickerCalls } from './importStickers';
import { uploadImportFile } from './uploadImportFile';
import { IMPORT_BATCH_SIZE, type ParsedChat, type ParsedNotice } from './types';

export interface ImportProgress {
  phase: 'importing' | 'finishing';
  done: number;
  total: number;
  filesDone: number;
  filesTotal: number;
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

const retryable = (error: unknown) => {
  const status = errorStatus(error);
  return status === 'FETCH_ERROR' || (typeof status === 'number' && status >= 500);
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
  const checkAbort = () => {
    if (options.signal?.aborted) throw new ImportRunError('cancelled');
  };
  const files = createImportFiles(options, resolved);
  const context = { attachmentIds: files.ids, skipped: files.skipped, noticeText: options.noticeText };
  const total = options.chat.messages.length;
  let index = options.fromIndex;
  let failures = 0;
  const report = (phase: ImportProgress['phase'] = 'importing') => options.onProgress({
    phase, done: Math.min(index, total), total, filesDone: files.done(), filesTotal: files.total,
  });
  report();
  while (index < total) {
    checkAbort();
    const window = options.chat.messages.slice(index, index + IMPORT_BATCH_SIZE);
    await files.place(window, () => report(), checkAbort)
      .catch((error: unknown) => { throw options.signal?.aborted ? new ImportRunError('cancelled') : error; });
    files.save();
    const messages = window.map((message) => importedMessage(message, context));
    const result = await resolved.calls.addMessages(options.importId, { from_index: index, messages }, options.signal);
    if (!result.error) {
      failures = 0;
      index = Math.max(result.data.next_index, index + 1);
    } else if (errorStatus(result.error) === 409 && failures < RETRIES) {
      failures += 1;
      const current = await resolved.calls.get(options.importId, options.signal);
      if (current.error) throw new ImportRunError('stopped');
      index = current.data.next_index;
    } else if (retryable(result.error) && failures < RETRIES) {
      failures += 1;
      await resolved.wait(1000 * failures);
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
