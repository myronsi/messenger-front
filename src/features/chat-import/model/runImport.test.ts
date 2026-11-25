import { describe, expect, it, vi } from 'vitest';
import type { AddImportMessagesRequest, ChatImport } from '../api/importTypes';
import { ImportRunError, runImport, type RunDeps, type RunOptions } from './runImport';
import type { ParsedChat, ParsedMessage } from './types';

const MB = 1024 * 1024;
const at = '2019-03-12T14:05:00.000Z';
const done: ChatImport = {
  id: '9', chat_id: '7', source: 'telegram', state: 'done', message_count: 0, file_count: 0, created_at: at, finished_at: null, first_at: at, last_at: at, next_index: 0, imported_by: '1', senders: [],
};

const chatOf = (count: number, attachments: Record<number, ParsedMessage['attachment']> = {}): ParsedChat => ({
  source: 'telegram', title: 'Trip', fileCount: Object.keys(attachments).length, firstAt: at, lastAt: at, senders: [],
  messages: Array.from({ length: count }, (_, index) => ({
    index, senderKey: 'a', originalAt: at, text: attachments[index] ? '' : `m${index}`, ...(attachments[index] ? { attachment: attachments[index] } : {}),
  })),
});

const ok = <T,>(data: T) => Promise.resolve({ data });
const fail = (status: number | string, code?: string) => Promise.resolve({ error: { status, data: code ? { code } : null } as never });

const setup = (overrides: Partial<RunDeps['calls']> = {}, upload: RunDeps['upload'] = vi.fn(async (_file, attachment) => ({ id: `id-${attachment.path}` }))) => {
  const batches: AddImportMessagesRequest[] = [];
  const calls = {
    addMessages: vi.fn(async (_id: unknown, body: AddImportMessagesRequest) => {
      batches.push(body);
      return { data: { next_index: body.from_index + body.messages.length } };
    }),
    finish: vi.fn(() => ok(done)),
    get: vi.fn(() => ok({ ...done, state: 'running' as const, next_index: 0 })),
    ...overrides,
  } as unknown as RunDeps['calls'];
  const deps: RunDeps = { calls, upload, readFile: vi.fn(async (path: string) => new File(['x'], path)), wait: vi.fn(async () => undefined) };
  return { deps, batches, calls };
};

const options = (chat: ParsedChat, fields: Partial<RunOptions> = {}): RunOptions => ({
  importId: '9', chat, fromIndex: 0, uploaded: {}, noticeText: (notice) => `notice:${notice.code}:${notice.detail}`,
  onProgress: vi.fn(), onUploaded: vi.fn(), ...fields,
});

describe('runImport', () => {
  it('sends batches of 500 in order and finishes', async () => {
    const { deps, batches, calls } = setup();
    const result = await runImport(options(chatOf(1201)), deps);
    expect(batches.map((batch) => [batch.from_index, batch.messages.length])).toEqual([[0, 500], [500, 500], [1000, 201]]);
    expect(batches[2].messages[200]).toMatchObject({ index: 1200, content: 'm1200' });
    expect(calls.finish).toHaveBeenCalledWith('9');
    expect(result).toBe(done);
  });

  it('uploads files first, once per path, and links them', async () => {
    const photo = { path: 'photos/p.jpg', name: 'p.jpg', kind: 'image' as const, size: 10 };
    const chat = chatOf(3, { 0: photo, 2: photo });
    const { deps, batches } = setup();
    const progress = vi.fn();
    const uploaded = vi.fn();
    await runImport(options(chat, { onProgress: progress, onUploaded: uploaded }), deps);
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(batches[0].messages[0]).toMatchObject({ type: 'file', attachment_ids: ['id-photos/p.jpg'] });
    expect(batches[0].messages[2]).toMatchObject({ attachment_ids: ['id-photos/p.jpg'] });
    expect(uploaded).toHaveBeenLastCalledWith({ 'photos/p.jpg': 'id-photos/p.jpg' });
    expect(progress.mock.calls.map(([value]) => value.phase)).toEqual(['files', 'files', 'messages', 'messages', 'finishing']);
  });

  it('skips files over the limit and files the server refuses as grey lines', async () => {
    const big = { path: 'v.mp4', name: 'v.mp4', kind: 'video' as const, size: 200 * MB };
    const odd = { path: 'a.pdf', name: 'a.pdf', kind: 'file' as const, size: 10 };
    const upload = vi.fn(async () => ({ skipped: 'fileUnsupported' as const }));
    const { deps, batches } = setup({}, upload);
    await runImport(options(chatOf(2, { 0: big, 1: odd })), deps);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(batches[0].messages.map((item) => [item.type, item.content])).toEqual([
      ['note', 'notice:fileTooLarge:v.mp4'], ['note', 'notice:fileUnsupported:a.pdf'],
    ]);
  });

  it('continues at next_index without uploading files again', async () => {
    const photo = { path: 'p.jpg', name: 'p.jpg', kind: 'image' as const, size: 10 };
    const { deps, batches } = setup();
    await runImport(options(chatOf(700, { 650: photo }), { fromIndex: 600, uploaded: { 'p.jpg': 'old-id' } }), deps);
    expect(deps.upload).not.toHaveBeenCalled();
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({ from_index: 600 });
    expect(batches[0].messages[50]).toMatchObject({ index: 650, attachment_ids: ['old-id'] });
  });

  it('reads next_index again after a 409 for a batch', async () => {
    let first = true;
    const addMessages = vi.fn(async (_id: unknown, body: AddImportMessagesRequest) => {
      if (first) {
        first = false;
        return fail(409, 'conflict');
      }
      return ok({ next_index: body.from_index + body.messages.length });
    });
    const { deps } = setup({ addMessages, get: vi.fn(() => ok({ ...done, next_index: 500 })) } as never);
    await runImport(options(chatOf(800)), deps);
    expect(addMessages.mock.calls.map(([, body]) => (body as AddImportMessagesRequest).from_index)).toEqual([0, 500]);
  });

  it('retries a failed batch and stops after repeated failures', async () => {
    const { deps } = setup({ addMessages: vi.fn(() => fail(503)) } as never);
    await expect(runImport(options(chatOf(10)), deps)).rejects.toEqual(new ImportRunError('stopped'));
    expect(deps.calls.addMessages).toHaveBeenCalledTimes(3);
    expect(deps.wait).toHaveBeenCalledTimes(2);
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const { deps } = setup();
    await expect(runImport(options(chatOf(10), { signal: controller.signal }), deps)).rejects.toMatchObject({ code: 'cancelled' });
  });
});
