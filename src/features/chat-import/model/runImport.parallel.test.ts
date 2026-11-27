import { describe, expect, it, vi } from 'vitest';
import type { AddImportMessagesRequest, ChatImport } from '../api/importTypes';
import { UPLOAD_CONCURRENCY } from './importFiles';
import { runImport, type RunDeps, type RunOptions } from './runImport';
import type { ParsedAttachment, ParsedChat } from './types';

const at = '2026-05-14T19:09:00.000Z';
const done = { id: '9', state: 'done', next_index: 0 } as unknown as ChatImport;
const photo = (path: string): ParsedAttachment => ({ path, name: path, kind: 'image', size: 10 });

const chatOf = (count: number, files: Record<number, ParsedAttachment>): ParsedChat => ({
  source: 'whatsapp', title: 'Chat', fileCount: Object.keys(files).length, firstAt: at, lastAt: at, senders: [],
  messages: Array.from({ length: count }, (_, index) => ({
    index, senderKey: 'a', originalAt: at, text: files[index] ? '' : `m${index}`, ...(files[index] ? { attachment: files[index] } : {}),
  })),
});

const options = (chat: ParsedChat): RunOptions => ({
  importId: '9', chat, fromIndex: 0, uploaded: {}, noticeText: (notice) => notice.code, onProgress: vi.fn(), onUploaded: vi.fn(),
});

const tick = () => new Promise((resolve) => { setTimeout(resolve, 0); });

const deps = (upload: RunDeps['upload'], addMessages?: (body: AddImportMessagesRequest) => Promise<unknown>, contents: Record<string, string> = {}): RunDeps => ({
  calls: {
    addMessages: vi.fn(async (_id: unknown, body: AddImportMessagesRequest) => {
      await addMessages?.(body);
      return { data: { next_index: body.from_index + body.messages.length } };
    }),
    finish: vi.fn(async () => ({ data: done })),
    get: vi.fn(),
  } as unknown as RunDeps['calls'],
  upload,
  readFile: vi.fn(async (path: string) => new File([contents[path] ?? path], path)),
  wait: vi.fn(async () => undefined),
});

describe('runImport uploads in parallel', () => {
  it(`keeps at most ${UPLOAD_CONCURRENCY} uploads running and uploads every file`, async () => {
    let running = 0;
    let most = 0;
    const upload = vi.fn(async (_file: File, attachment: ParsedAttachment) => {
      running += 1;
      most = Math.max(most, running);
      await tick();
      running -= 1;
      return { id: `id-${attachment.path}` };
    });
    const files = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, photo(`f${i}.jpg`)]));
    await runImport(options(chatOf(8, files)), deps(upload as unknown as RunDeps['upload']));
    expect(upload).toHaveBeenCalledTimes(8);
    expect(most).toBe(UPLOAD_CONCURRENCY);
  });

  it('uploads identical files once even when they are read at the same time', async () => {
    const upload = vi.fn(async (_file: File, attachment: ParsedAttachment) => {
      await tick();
      return { id: `id-${attachment.path}` };
    });
    const contents = { 'a.jpg': 'same', 'b.jpg': 'same', 'c.jpg': 'same', 'd.jpg': 'other' };
    const run = deps(upload as unknown as RunDeps['upload'], undefined, contents);
    const sent: AddImportMessagesRequest[] = [];
    (run.calls.addMessages as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (_id: unknown, body: AddImportMessagesRequest) => {
      sent.push(body);
      return { data: { next_index: body.from_index + body.messages.length } };
    });
    await runImport(options(chatOf(4, { 0: photo('a.jpg'), 1: photo('b.jpg'), 2: photo('c.jpg'), 3: photo('d.jpg') })), run);
    expect(upload).toHaveBeenCalledTimes(2);
    const ids = sent[0].messages.map((message) => message.attachment_ids?.[0]);
    expect(new Set(ids.slice(0, 3)).size).toBe(1);
    expect(ids[3]).toBe('id-d.jpg');
  });

  it("uploads the next batch's files while the current batch is sent", async () => {
    const order: string[] = [];
    let releaseFirstBatch: () => void = () => undefined;
    const firstBatchHeld = new Promise<void>((resolve) => { releaseFirstBatch = resolve; });
    const upload = vi.fn(async (_file: File, attachment: ParsedAttachment) => {
      order.push(`upload:${attachment.path}`);
      if (attachment.path === 'late.jpg') releaseFirstBatch();
      return { id: `id-${attachment.path}` };
    });
    const addMessages = async (body: AddImportMessagesRequest) => {
      order.push(`send:${body.from_index}`);
      if (body.from_index === 0) await firstBatchHeld;
      order.push(`sent:${body.from_index}`);
    };
    await runImport(options(chatOf(600, { 0: photo('early.jpg'), 550: photo('late.jpg') })), deps(upload as unknown as RunDeps['upload'], addMessages));
    expect(order.indexOf('upload:late.jpg')).toBeLessThan(order.indexOf('sent:0'));
    expect(order.indexOf('upload:late.jpg')).toBeGreaterThan(order.indexOf('send:0'));
    expect(order.slice(-2)).toEqual(['send:500', 'sent:500']);
  });
});
