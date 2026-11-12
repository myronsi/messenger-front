import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '../model/types';
import { discardServerUnsent, fetchServerUnsent, keptAttachmentIds, resendKeptFile } from './unsentApi';

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ apiClient: client }));

const ok = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) });
const attachment = { id: 'a1', kind: 'file', url: '/media/a1', filename: 'route.zip', content_type: 'application/zip', size: 12 };

beforeEach(() => Object.values(client).forEach((fn) => fn.mockReset()));

describe('server outbox api', () => {
  it('turns kept sends into message fields and skips foreign temporary ids', async () => {
    client.GET.mockResolvedValue(ok({ items: [
      { chat_id: '3', client_temp_id: '-5', type: 'file', content: 'pack', reply_to: '9', attachments: [attachment], error_code: 'forbidden',
        created_at: '2026-11-12T09:00:00Z' },
      { chat_id: '3', client_temp_id: 'not-ours', type: 'text', content: 'x', reply_to: null, attachments: [], error_code: 'forbidden',
        created_at: '2026-11-12T09:00:00Z' },
    ] }));
    const kept = await fetchServerUnsent('3');
    expect(client.GET).toHaveBeenCalledWith('/chats/{chat_id}/unsent', { params: { path: { chat_id: '3' } } });
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ tempId: -5, code: 'forbidden', fields: { type: 'file', reply_to: '9', timestamp: '2026-11-12T09:00:00Z' } });
    expect(kept[0].fields.content).toMatchObject({ attachment_id: 'a1', file_name: 'route.zip', caption: 'pack' });
  });

  it('resends a kept file with its uploaded attachments and the same temporary id', async () => {
    client.POST.mockResolvedValue(ok({ id: '50' }, 201));
    const message = { id: -5, client_temp_id: -5, type: 'file', reply_to: '9', timestamp: '', sender: 'me', read_by: [],
      content: { attachment_id: 'a1', file_url: '/media/a1', file_name: 'route.zip', file_type: 'application/zip', caption: 'pack' } } as unknown as Message;
    expect(keptAttachmentIds(message)).toEqual(['a1']);
    await resendKeptFile('3', message);
    expect(client.POST).toHaveBeenCalledWith('/chats/{chat_id}/messages', { params: { path: { chat_id: '3' } },
      body: { client_temp_id: '-5', type: 'file', attachment_id: 'a1', content: 'pack', reply_to: '9' } });
  });

  it('knows no attachments for a local file that never reached the server', () => {
    const local = { id: -6, content: { file_url: 'blob:x', file_name: 'a.png', file_type: 'image/png' } } as unknown as Message;
    expect(keptAttachmentIds(local)).toEqual([]);
  });

  it('discards a kept send and accepts one that is already gone', async () => {
    client.DELETE.mockResolvedValue({ response: new Response(null, { status: 404 }) });
    await expect(discardServerUnsent('3', -5)).resolves.toBeUndefined();
    expect(client.DELETE).toHaveBeenCalledWith('/chats/{chat_id}/unsent/{client_temp_id}', { params: { path: { chat_id: '3', client_temp_id: '-5' } } });
  });
});
