import type { EntityId } from '@/shared/api/entityId';
import type { SkipReason } from './importRequest';
import { addImportSticker, FILE_HASH_KEY, fileDigest, STICKER_HASH_KEY, STICKER_KEY, type StickerCalls } from './importStickers';
import { importTimer } from './importTimings';
import { isLottieSticker, precheck, type uploadImportFile } from './uploadImportFile';
import { withRetry } from './uploadRetry';
import { IMPORT_BATCH_SIZE, type ParsedAttachment, type ParsedChat, type ParsedMessage } from './types';

const SAVE_EVERY = 20;
export const UPLOAD_CONCURRENCY = 3;
export const LOOKAHEAD_BATCHES = 3;
export const PREPARED_BYTES = 64 * 1024 * 1024;
export const PREPARED_FILES = 32;

export interface FileDeps {
  upload: typeof uploadImportFile;
  readFile: (path: string) => Promise<File>;
  wait: (ms: number) => Promise<void>;
  stickers?: StickerCalls;
}

export interface FileOptions {
  importId: EntityId;
  chat: ParsedChat;
  fromIndex: number;
  uploaded: Record<string, EntityId>;
  stickerPackTitle?: string;
  onUploaded: (uploaded: Record<string, EntityId>) => void;
  onStep?: () => void;
  onWait?: (seconds: number) => void;
  signal?: AbortSignal;
  timer?: ReturnType<typeof importTimer>;
}

interface Planned {
  attachment: ParsedAttachment;
  at: number;
}

const captioned = new WeakMap<ParsedChat, Set<string>>();

const captionedPaths = (chat: ParsedChat) => {
  let paths = captioned.get(chat);
  if (!paths) {
    paths = new Set(chat.messages.flatMap((message) => (message.attachment && message.text ? [message.attachment.path] : [])));
    captioned.set(chat, paths);
  }
  return paths;
};

const distinctAttachments = (messages: readonly ParsedMessage[], from = 0): Planned[] => {
  const byPath = new Map<string, Planned>();
  messages.forEach((message, offset) => {
    if (message.attachment && !byPath.has(message.attachment.path)) byPath.set(message.attachment.path, { attachment: message.attachment, at: from + offset });
  });
  return [...byPath.values()];
};

const createSlots = (size: number) => {
  let free = size;
  const waiting: (() => void)[] = [];
  return async <T>(run: () => Promise<T>): Promise<T> => {
    if (free > 0) free -= 1;
    else await new Promise<void>((resolve) => { waiting.push(resolve); });
    try {
      return await run();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else free += 1;
    }
  };
};

const createSignal = () => {
  let wake: () => void = () => undefined;
  let next = new Promise<void>((resolve) => { wake = resolve; });
  return {
    changed: () => next,
    notify: () => {
      const current = wake;
      next = new Promise<void>((resolve) => { wake = resolve; });
      current();
    },
  };
};

export const createImportFiles = (options: FileOptions, deps: FileDeps) => {
  const ids = new Map(Object.entries(options.uploaded));
  const skipped = new Map<string, SkipReason>();
  const skippedHashes = new Map<string, SkipReason>();
  const seen = new Set<string>();
  const queue = distinctAttachments(options.chat.messages.slice(options.fromIndex), options.fromIndex);
  const total = queue.length;
  const timer = options.timer ?? importTimer(false);
  const inUploadSlot = createSlots(UPLOAD_CONCURRENCY);
  const progress = createSignal();
  const started = new Set<string>();
  const urgent: Planned[] = [];
  let cursor = 0;
  let limit = options.fromIndex + (LOOKAHEAD_BATCHES + 1) * IMPORT_BATCH_SIZE;
  let heldBytes = 0;
  let heldFiles = 0;
  let failure: { error: unknown } | null = null;
  let closed = false;
  let sinceSave = 0;
  const inflight = new Map<string, Promise<unknown>>();
  let stickerLane: Promise<unknown> = Promise.resolve();

  const once = <T>(key: string | null, run: () => Promise<T>): Promise<T> => {
    if (key === null) return run();
    const current = (inflight.get(key) ?? Promise.resolve()).catch(() => undefined).then(run);
    inflight.set(key, current);
    return current.finally(() => {
      if (inflight.get(key) === current) inflight.delete(key);
    });
  };

  const inStickerLane = <T>(run: () => Promise<T>): Promise<T> => {
    const next = stickerLane.catch(() => undefined).then(run);
    stickerLane = next;
    return next;
  };

  const retry = { wait: deps.wait, signal: options.signal, onWait: options.onWait };
  const stickerCalls: StickerCalls | undefined = deps.stickers && {
    upload: (file, attachment, importId, signal) => withRetry(() => deps.stickers!.upload(file, attachment, importId, signal), retry),
    createPack: (title) => withRetry(() => deps.stickers!.createPack(title), retry),
    addSticker: (packId, imageId, emoji) => withRetry(() => deps.stickers!.addSticker(packId, imageId, emoji), retry),
  };
  const placed = (path: string) => ids.has(path) || ids.has(STICKER_KEY + path);
  const save = () => {
    sinceSave = 0;
    options.onUploaded(Object.fromEntries(ids));
  };

  const placeSticker = async (file: File, attachment: ParsedAttachment, hash: string | null) => {
    if (attachment.kind !== 'sticker' || !stickerCalls || !options.stickerPackTitle || captionedPaths(options.chat).has(attachment.path)) return false;
    const title = options.stickerPackTitle;
    const sticker = await once(hash === null ? null : STICKER_HASH_KEY + hash, () => inStickerLane(() => inUploadSlot(async () => {
      const known = hash === null ? undefined : ids.get(STICKER_HASH_KEY + hash);
      return known ?? timer('upload', () => addImportSticker(file, attachment, options.importId, ids, title, stickerCalls, options.signal));
    })));
    if (sticker === null) return false;
    ids.set(STICKER_KEY + attachment.path, sticker);
    if (hash !== null) ids.set(STICKER_HASH_KEY + hash, sticker);
    return true;
  };

  const uploadOnce = (file: File, attachment: ParsedAttachment, hash: string | null) => once(hash === null ? null : FILE_HASH_KEY + hash, async () => {
    const known = hash === null ? undefined : ids.get(FILE_HASH_KEY + hash);
    if (known !== undefined) return { id: known };
    const refused = hash === null ? undefined : skippedHashes.get(hash);
    if (refused !== undefined) return { skipped: refused };
    const uploaded = await inUploadSlot(() => timer('upload', () => withRetry(() => deps.upload(file, attachment, options.importId, options.signal), retry)));
    if (hash !== null) {
      if ('id' in uploaded) ids.set(FILE_HASH_KEY + hash, uploaded.id);
      else skippedHashes.set(hash, uploaded.skipped);
    }
    return uploaded;
  });

  const placeFile = async (attachment: ParsedAttachment) => {
    const file = await timer('read', () => deps.readFile(attachment.path));
    const hash = await timer('hash', () => fileDigest(file));
    if (await placeSticker(file, attachment, hash)) return;
    if (isLottieSticker(attachment)) {
      skipped.set(attachment.path, 'fileUnsupported');
      return;
    }
    const outcome = await uploadOnce(file, attachment, hash);
    if ('skipped' in outcome) {
      skipped.set(attachment.path, outcome.skipped);
      return;
    }
    ids.set(attachment.path, outcome.id);
  };

  const placeOne = async (attachment: ParsedAttachment) => {
    const reason = placed(attachment.path) ? null : precheck(attachment);
    if (reason) skipped.set(attachment.path, reason);
    else if (!placed(attachment.path)) {
      await placeFile(attachment);
      sinceSave += 1;
      if (sinceSave >= SAVE_EVERY) save();
    }
    seen.add(attachment.path);
    options.onStep?.();
  };

  const nextPlanned = () => {
    while (urgent.length > 0 && started.has(urgent[0].attachment.path)) urgent.shift();
    if (urgent.length > 0) return urgent[0];
    while (cursor < queue.length && started.has(queue[cursor].attachment.path)) cursor += 1;
    return cursor < queue.length && queue[cursor].at < limit ? queue[cursor] : null;
  };

  const pump = () => {
    while (!failure && !closed) {
      const next = nextPlanned();
      if (!next) return;
      const bytes = placed(next.attachment.path) || precheck(next.attachment) ? 0 : Math.max(1, next.attachment.size ?? 1);
      if (heldFiles > 0 && (heldFiles >= PREPARED_FILES || heldBytes + bytes > PREPARED_BYTES)) return;
      if (options.signal?.aborted) {
        failure = { error: options.signal.reason };
        progress.notify();
        return;
      }
      started.add(next.attachment.path);
      heldBytes += bytes;
      heldFiles += 1;
      placeOne(next.attachment)
        .catch((error: unknown) => {
          failure ??= { error };
        })
        .finally(() => {
          heldBytes -= bytes;
          heldFiles -= 1;
          progress.notify();
          pump();
        });
    }
  };

  const advance = (index: number) => {
    limit = Math.max(limit, index + (LOOKAHEAD_BATCHES + 1) * IMPORT_BATCH_SIZE);
    pump();
  };

  const ready = async (messages: readonly ParsedMessage[], checkAbort: () => void) => {
    const needed = distinctAttachments(messages).filter((planned) => !seen.has(planned.attachment.path));
    urgent.unshift(...needed.filter((planned) => !started.has(planned.attachment.path)));
    pump();
    while (needed.some((planned) => !seen.has(planned.attachment.path))) {
      if (failure) throw failure.error;
      checkAbort();
      await progress.changed();
    }
    if (failure) throw failure.error;
  };

  const onAbort = () => progress.notify();
  options.signal?.addEventListener('abort', onAbort);
  const close = () => {
    closed = true;
    options.signal?.removeEventListener('abort', onAbort);
    progress.notify();
  };

  pump();
  return { ids, skipped, total, done: () => seen.size, advance, ready, close, save };
};
