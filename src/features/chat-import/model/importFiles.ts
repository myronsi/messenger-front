import type { EntityId } from '@/shared/api/entityId';
import type { SkipReason } from './importRequest';
import { addImportSticker, FILE_HASH_KEY, fileDigest, STICKER_HASH_KEY, STICKER_KEY, type StickerCalls } from './importStickers';
import { isLottieSticker, precheck, type uploadImportFile } from './uploadImportFile';
import type { ParsedAttachment, ParsedChat, ParsedMessage } from './types';

const SAVE_EVERY = 20;

export interface FileDeps {
  upload: typeof uploadImportFile;
  readFile: (path: string) => Promise<File>;
  stickers?: StickerCalls;
}

export interface FileOptions {
  importId: EntityId;
  chat: ParsedChat;
  fromIndex: number;
  uploaded: Record<string, EntityId>;
  stickerPackTitle?: string;
  onUploaded: (uploaded: Record<string, EntityId>) => void;
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

  const placed = (path: string) => ids.has(path) || ids.has(STICKER_KEY + path);
  const save = () => {
    sinceSave = 0;
    options.onUploaded(Object.fromEntries(ids));
  };

  const placeSticker = async (file: File, attachment: ParsedAttachment, hash: string | null) => {
    if (attachment.kind !== 'sticker' || !deps.stickers || !options.stickerPackTitle || captionedPaths(options.chat).has(attachment.path)) return false;
    const known = hash === null ? undefined : ids.get(STICKER_HASH_KEY + hash);
    const sticker = known ?? await addImportSticker(file, attachment, ids, options.stickerPackTitle, deps.stickers, options.signal);
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

  const place = async (messages: readonly ParsedMessage[], onStep: () => void, checkAbort: () => void) => {
    for (const attachment of distinctAttachments(messages)) {
      if (seen.has(attachment.path)) continue;
      checkAbort();
      const reason = placed(attachment.path) ? null : precheck(attachment);
      if (reason) skipped.set(attachment.path, reason);
      else if (!placed(attachment.path)) {
        await placeFile(attachment);
        sinceSave += 1;
        if (sinceSave >= SAVE_EVERY) save();
      }
      seen.add(attachment.path);
      onStep();
    }
  };

  return { ids, skipped, total, done: () => seen.size, place, save };
};
