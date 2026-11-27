import { createRequestHandler, type ImportReply, type ImportRequest, type ImportResult } from '../archive/importRequests';
import { localeDateOrder } from '../parsers/common';
import type { DateOrder, ParseErrorCode, ParsedChat } from './types';
import { ImportParseError } from './types';

export interface ImportReader {
  open: (files: File[]) => Promise<ParsedChat>;
  reparse: (order: DateOrder, timeZone?: string) => Promise<ParsedChat>;
  file: (path: string) => Promise<File>;
  close: () => void;
}

type Send = (request: ImportRequest) => Promise<ImportResult>;

const PARSE_ERRORS: readonly string[] = ['telegramHtml', 'telegramAccountExport', 'unknownFormat', 'noChatFile', 'emptyChat', 'brokenFile'];

const failure = (code: string | undefined) => new ImportParseError((PARSE_ERRORS.includes(code ?? '') ? code : 'brokenFile') as ParseErrorCode);

const workerSend = (): { send: Send; close: () => void } => {
  const worker = new Worker(new URL('../workers/importWorker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, { resolve: (result: ImportResult) => void; reject: (error: Error) => void }>();
  let nextId = 1;
  worker.addEventListener('message', (event: MessageEvent<ImportReply>) => {
    const waiting = pending.get(event.data.id);
    if (!waiting) return;
    pending.delete(event.data.id);
    if (event.data.result) waiting.resolve(event.data.result);
    else waiting.reject(failure(event.data.error));
  });
  worker.addEventListener('error', () => {
    for (const waiting of pending.values()) waiting.reject(failure('brokenFile'));
    pending.clear();
  });
  return {
    send: (request) => new Promise((resolve, reject) => {
      const id = nextId;
      nextId += 1;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, request });
    }),
    close: () => worker.terminate(),
  };
};

const localSend = (): { send: Send; close: () => void } => {
  const handle = createRequestHandler();
  return { send: handle, close: () => undefined };
};

export const createImportReader = (useWorker = typeof Worker !== 'undefined'): ImportReader => {
  const { send, close } = useWorker ? workerSend() : localSend();
  return {
    open: async (files) => await send({ type: 'open', files, localeOrder: localeDateOrder() }) as ParsedChat,
    reparse: async (order, timeZone) => await send({ type: 'reparse', order, timeZone }) as ParsedChat,
    file: async (path) => await send({ type: 'file', path }) as File,
    close,
  };
};
