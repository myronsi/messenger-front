import type { EntityId } from '@/shared/api/entityId';
import type { SkipReason } from './importRequest';
import { addImportSticker, FILE_HASH_KEY, fileDigest, STICKER_HASH_KEY, STICKER_KEY, type StickerCalls } from './importStickers';
import { isLottieSticker, precheck, type uploadImportFile } from './uploadImportFile';
import { withRetry } from './uploadRetry';
import type { ParsedAttachment, ParsedChat, ParsedMessage } from './types';

const SAVE_EVERY = 20;
export const UPLOAD_CONCURRENCY = 3;

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
  onWait?: (seconds: number) => void;
  signal?: AbortSignal;
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

const distinctAttachments = (messages: readonly ParsedMessage[]) => {
  const byPath = new Map<string, ParsedAttachment>();
  for (const message of messages) {
    if (message.attachment && !byPath.has(message.attachment.path)) byPath.set(message.attachment.path, message.attachment);
  }
  return [...byPath.values()];
};

export const createImportFiles = (options: FileOptions, deps: FileDeps) => {
  const ids = new Map(Object.entries(options.uploaded));
  const skipped = new Map<string, SkipReason>();
  const seen = new Set<string>();
  const total = distinctAttachments(options.chat.messages.slice(options.fromIndex)).length;
  let sinceSave = 0;
  const inflight = new Map<string, Promise<unknown>>();
  let stickerLane: Promise<unknown> = Promise.resolve();

  const once = async <T>(key: string | null, run: () => Promise<T>): Promise<T> => {
    if (key === null) return run();
    const before = inflight.get(key);
    if (before) await before.catch(() => undefined);
    const current = run();
    inflight.set(key, current);
    try {
      return await current;
    } finally {
      if (inflight.get(key) === current) inflight.delete(key);
    }
  };

  const inStickerLane = <T>(run: () => Promise<T>): Promise<T> => {
    const next = stickerLane.catch(() => undefined).then(run);
    stickerLane = next;
    return next;
  };

  const retry = { wait: deps.wait, signal: options.signal, onWait: options.onWait };
  const stickerCalls: StickerCalls | undefined = deps.stickers && {
    upload: (file, attachment, signal) => withRetry(() => deps.stickers!.upload(file, attachment, signal), retry),
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
    const sticker = await once(hash === null ? null : STICKER_HASH_KEY + hash, () => inStickerLane(async () => {
      const known = hash === null ? undefined : ids.get(STICKER_HASH_KEY + hash);
      return known ?? addImportSticker(file, attachment, ids, title, stickerCalls, options.signal);
    }));
    if (sticker === null) return false;
    ids.set(STICKER_KEY + attachment.path, sticker);
    if (hash !== null) ids.set(STICKER_HASH_KEY + hash, sticker);
    return true;
  };

  const placeFile = async (attachment: ParsedAttachment) => {
    const file = await deps.readFile(attachment.path);
    const hash = await fileDigest(file);
    if (await placeSticker(file, attachment, hash)) return;
    if (isLottieSticker(attachment)) {
      skipped.set(attachment.path, 'fileUnsupported');
      return;
    }
    const outcome = await once(hash === null ? null : FILE_HASH_KEY + hash, async () => {
      const known = hash === null ? undefined : ids.get(FILE_HASH_KEY + hash);
      if (known !== undefined) return { id: known };
      const uploaded = await withRetry(() => deps.upload(file, attachment, options.importId, options.signal), retry);
      if ('id' in uploaded && hash !== null) ids.set(FILE_HASH_KEY + hash, uploaded.id);
      return uploaded;
    });
    if ('skipped' in outcome) {
      skipped.set(attachment.path, outcome.skipped);
      return;
    }
    ids.set(attachment.path, outcome.id);
  };

  const placeOne = async (attachment: ParsedAttachment, onStep: () => void) => {
    const reason = placed(attachment.path) ? null : precheck(attachment);
    if (reason) skipped.set(attachment.path, reason);
    else if (!placed(attachment.path)) {
      await placeFile(attachment);
      sinceSave += 1;
      if (sinceSave >= SAVE_EVERY) save();
    }
    seen.add(attachment.path);
    onStep();
  };

  const place = async (messages: readonly ParsedMessage[], onStep: () => void, checkAbort: () => void) => {
    const queue = distinctAttachments(messages).filter((attachment) => !seen.has(attachment.path));
    let next = 0;
    let failed = false;
    const lane = async () => {
      while (!failed && next < queue.length) {
        const attachment = queue[next];
        next += 1;
        try {
          checkAbort();
          await placeOne(attachment, onStep);
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, lane));
  };

  return { ids, skipped, total, done: () => seen.size, place, save };
};
