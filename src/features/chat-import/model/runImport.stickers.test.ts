import { describe, expect, it, vi } from 'vitest';
import type { AddImportMessagesRequest, ChatImport } from '../api/importTypes';
import type { StickerCalls } from './importStickers';
import { packTitle } from './importStickers';
import { runImport, type RunDeps, type RunOptions } from './runImport';
import type { ParsedAttachment, ParsedChat } from './types';

const at = '2026-05-14T19:09:00.000Z';
const done = { id: '9', state: 'done', next_index: 0 } as unknown as ChatImport;

const sticker = (path: string, emoji?: string): ParsedAttachment => ({ path, name: path, kind: 'sticker', size: 10, ...(emoji ? { emoji } : {}) });

const chatOf = (attachments: ParsedAttachment[], texts: Record<number, string> = {}): ParsedChat => ({
  source: 'whatsapp', title: 'Chat', fileCount: attachments.length, firstAt: at, lastAt: at, senders: [],
  messages: attachments.map((attachment, index) => ({ index, senderKey: 'a', originalAt: at, text: texts[index] ?? '', attachment })),
});

const contents: Record<string, string> = { 'a.webp': 'cat', 'b.webp': 'cat', 'c.webp': 'dog', 'p.jpg': 'photo', 'q.jpg': 'photo' };

const setup = (stickers: Partial<StickerCalls> = {}) => {
  const batches: AddImportMessagesRequest[] = [];
  let packs = 0;
  let added = 0;
  const calls: StickerCalls = {
    upload: vi.fn(async (_file: File, attachment: ParsedAttachment) => `img-${attachment.path}`),
    createPack: vi.fn(async () => {
      packs += 1;
      return `new-${packs}`;
    }),
    addSticker: vi.fn(async (pack: string | number) => {
      added += 1;
      return `st-${pack}-${added}`;
    }),
    ...stickers,
  };
  const deps: RunDeps = {
    calls: {
      addMessages: vi.fn(async (_id: unknown, body: AddImportMessagesRequest) => {
        batches.push(body);
        return { data: { next_index: body.from_index + body.messages.length } };
      }),
      finish: vi.fn(async () => ({ data: done })),
      get: vi.fn(),
    } as unknown as RunDeps['calls'],
    upload: vi.fn(async (_file: File, attachment: ParsedAttachment) => ({ id: `file-${attachment.path}` })),
    readFile: vi.fn(async (path: string) => new File([contents[path] ?? path], path)),
    wait: vi.fn(async () => undefined),
    stickers: calls,
  };
  return { deps, calls, batches };
};

const options = (chat: ParsedChat, fields: Partial<RunOptions> = {}): RunOptions => ({
  importId: '9', chat, fromIndex: 0, uploaded: {}, noticeText: (notice) => notice.code, stickerPackTitle: 'Imported stickers',
  onProgress: vi.fn(), onUploaded: vi.fn(), ...fields,
});

describe('runImport stickers', () => {
  it('adds each distinct sticker once to one pack and sends real sticker messages', async () => {
    const { deps, calls, batches } = setup();
    await runImport(options(chatOf([sticker('a.webp', '😺'), sticker('b.webp'), sticker('c.webp')])), deps);
    expect(calls.createPack).toHaveBeenCalledTimes(1);
    expect(calls.createPack).toHaveBeenCalledWith('Imported stickers');
    expect(calls.upload).toHaveBeenCalledTimes(2);
    expect(calls.addSticker).toHaveBeenNthCalledWith(1, 'new-1', 'img-a.webp', '😺');
    expect(calls.addSticker).toHaveBeenNthCalledWith(2, 'new-1', 'img-c.webp', '🙂');
    expect(deps.upload).not.toHaveBeenCalled();
    expect(batches[0].messages.map((message) => [message.type, message.sticker_id])).toEqual([
      ['sticker', 'st-new-1-1'], ['sticker', 'st-new-1-1'], ['sticker', 'st-new-1-2'],
    ]);
  });

  it('starts a new pack when the current one is full', async () => {
    const addSticker = vi.fn(async (pack: string | number) => (pack === 'pack-1' ? 'full' as const : `st-${pack}`));
    const { deps, calls, batches } = setup({ addSticker });
    const onUploaded = vi.fn();
    await runImport(options(chatOf([sticker('a.webp')]), { uploaded: { 'pack:current': 'pack-1', 'pack:count': '1' }, onUploaded }), deps);
    expect(calls.createPack).toHaveBeenCalledWith('Imported stickers 2');
    expect(batches[0].messages[0]).toMatchObject({ type: 'sticker', sticker_id: 'st-new-1' });
    expect(onUploaded).toHaveBeenLastCalledWith(expect.objectContaining({ 'pack:current': 'new-1', 'pack:count': '2' }));
  });

  it('falls back to a file message when the server refuses the sticker or the message has a caption', async () => {
    const { deps, batches } = setup({ upload: vi.fn(async () => null) });
    await runImport(options(chatOf([sticker('a.webp'), sticker('b.webp')])), deps);
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(batches[0].messages.map((message) => message.attachment_ids)).toEqual([['file-a.webp'], ['file-a.webp']]);

    const captioned = setup();
    await runImport(options(chatOf([sticker('c.webp')], { 0: 'look' })), captioned.deps);
    expect(captioned.batches[0].messages[0]).toMatchObject({ type: 'file', content: 'look' });
  });

  it('keeps the sticker line when an animated Telegram sticker cannot be converted', async () => {
    const { deps, batches } = setup({ upload: vi.fn(async () => null) });
    await runImport(options(chatOf([sticker('s.tgs', '🐱')])), deps);
    expect(deps.upload).not.toHaveBeenCalled();
    expect(batches[0].messages[0]).toMatchObject({ type: 'note', content: 'sticker' });
  });

  it('uploads identical files once even under different names', async () => {
    const photo = (path: string): ParsedAttachment => ({ path, name: path, kind: 'image', size: 10 });
    const { deps, batches } = setup();
    await runImport(options(chatOf([photo('p.jpg'), photo('q.jpg')])), deps);
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(batches[0].messages.map((message) => message.attachment_ids)).toEqual([['file-p.jpg'], ['file-p.jpg']]);
  });

  it('keeps stickers already placed before a resume', async () => {
    const { deps, calls, batches } = setup();
    await runImport(options(chatOf([sticker('a.webp')]), { uploaded: { 'sticker:a.webp': 'st-old' } }), deps);
    expect(calls.upload).not.toHaveBeenCalled();
    expect(batches[0].messages[0]).toMatchObject({ type: 'sticker', sticker_id: 'st-old' });
  });

  it('keeps pack titles within 64 characters', () => {
    expect(packTitle('x'.repeat(70), 3)).toHaveLength(64);
    expect(packTitle('Imported stickers', 1)).toBe('Imported stickers');
  });
});
