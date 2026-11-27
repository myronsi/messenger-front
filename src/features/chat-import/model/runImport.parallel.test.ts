import { describe, expect, it, vi } from 'vitest';
import type { AddImportMessagesRequest, ChatImport } from '../api/importTypes';
import { LOOKAHEAD_BATCHES, PREPARED_BYTES, UPLOAD_CONCURRENCY } from './importFiles';
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

  it('refuses a file once when identical copies are seen by several lanes at the same time', async () => {
    const upload = vi.fn(async () => {
      await tick();
      return { skipped: 'fileUnsupported' as const };
    });
    const contents = { 'a.jpg': 'same', 'b.jpg': 'same', 'c.jpg': 'same' };
    await runImport(options(chatOf(3, { 0: photo('a.jpg'), 1: photo('b.jpg'), 2: photo('c.jpg') })), deps(upload as unknown as RunDeps['upload'], undefined, contents));
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it(`prepares the files of the next ${LOOKAHEAD_BATCHES} batches while a batch is sent, and no further`, async () => {
    const order: string[] = [];
    let releaseFirstBatch: () => void = () => undefined;
    const firstBatchHeld = new Promise<void>((resolve) => { releaseFirstBatch = resolve; });
    const ahead = new Set(['f550.jpg', 'f1600.jpg']);
    const upload = vi.fn(async (_file: File, attachment: ParsedAttachment) => {
      order.push(`upload:${attachment.path}`);
      ahead.delete(attachment.path);
      if (ahead.size === 0) releaseFirstBatch();
      return { id: `id-${attachment.path}` };
    });
    const addMessages = async (body: AddImportMessagesRequest) => {
      order.push(`send:${body.from_index}`);
      if (body.from_index === 0) await firstBatchHeld;
      order.push(`sent:${body.from_index}`);
    };
    const files = { 0: photo('f0.jpg'), 550: photo('f550.jpg'), 1600: photo('f1600.jpg'), 2600: photo('f2600.jpg') };
    await runImport(options(chatOf(3000, files)), deps(upload as unknown as RunDeps['upload'], addMessages));
    expect(order.indexOf('upload:f1600.jpg')).toBeLessThan(order.indexOf('sent:0'));
    expect(order.indexOf('upload:f2600.jpg')).toBeGreaterThan(order.indexOf('sent:500'));
    expect(order.indexOf('upload:f2600.jpg')).toBeLessThan(order.indexOf('send:2500'));
    expect(order.filter((step) => step.startsWith('sent:'))).toEqual(['sent:0', 'sent:500', 'sent:1000', 'sent:1500', 'sent:2000', 'sent:2500']);
  });

  it('holds prepared files within the memory budget', async () => {
    let held = 0;
    let most = 0;
    const size = Math.floor(PREPARED_BYTES / 2) - 1;
    const big = (path: string): ParsedAttachment => ({ path, name: path, kind: 'video', size });
    const upload = vi.fn(async () => {
      await tick();
      held -= 1;
      return { id: 'x' };
    });
    const run = deps(upload as unknown as RunDeps['upload']);
    run.readFile = vi.fn(async (path: string) => {
      held += 1;
      most = Math.max(most, held);
      return new File([path], path);
    });
    const files = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i * 400, big(`v${i}.mp4`)]));
    await runImport(options(chatOf(2400, files)), run);
    expect(upload).toHaveBeenCalledTimes(6);
    expect(most).toBe(2);
  });
});
