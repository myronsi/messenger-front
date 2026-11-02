import { describe, expect, it, vi } from 'vitest';
import { withGoTransport } from './goTransport';
import { goClientEvent, goServerEvent } from './goSocket';
import { compareIds } from './entityId';

const base = 'https://staging.example.test/api/v2';
const id = '9007199254740993';
const user = { id, username: 'alice', display_name: 'Alice', contact_name: 'My Alice', avatar_url: null, bio: null, is_online: false, last_seen: null, is_deleted: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Go migration transport', () => {
  it('does not send an empty read receipt', async () => {
    const native = vi.fn();
    const response = await withGoTransport(native, base)(`${base}/chats/1/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_ids: [] }) });
    expect(native).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ read_message_ids: [] });
  });

  it('selects the largest read ID without losing Snowflake precision', async () => {
    const native = vi.fn().mockResolvedValue(json({}));
    await withGoTransport(native, base)(`${base}/chats/1/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_ids: ['9007199254740992', id, '9'] }) });
    expect(JSON.parse(native.mock.calls[0][1].body)).toEqual({ message_id: id });
  });
  it('preserves Request bodies when passing through Python and unrelated endpoints', async () => {
    for (const [configuredBase, target] of [['https://legacy.example.test', 'https://legacy.example.test/auth/login'], [base, 'https://other.example.test/upload']]) {
      const native = vi.fn(async (input: RequestInfo | URL) => {
        expect(await (input as Request).json()).toEqual({ username: 'alice', password: 'test-password' });
        return json({ ok: true });
      });
      const request = new Request(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'alice', password: 'test-password' }) });
      const response = await withGoTransport(native as typeof fetch, configuredBase)(request);
      expect(response.ok).toBe(true);
      expect(native).toHaveBeenCalledOnce();
    }
  });
  it('keeps IDs exact in links, sorting, and outgoing WebSocket frames', () => {
    expect(compareIds(id, '9007199254740992')).toBe(1);
    expect(compareIds('10', '9')).toBe(1);
    expect(goClientEvent({ type: 'message', content: 'hello {world}', client_temp_id: -1 }, id)).toEqual({
      type: 'message', chat_id: id, client_temp_id: '-1', data: { type: 'text', content: 'hello {world}', reply_to: null },
    });
  });

  it('maps chat and group deletion to their Go resources', async () => {
    const native = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const fetch = withGoTransport(native, base);
    await fetch(`${base}/chats/delete/${id}`, { method: 'DELETE' });
    await fetch(`${base}/groups/delete/${id}`, { method: 'DELETE' });
    expect(native.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      [`${base}/chats/${id}`, 'DELETE'],
      [`${base}/groups/${id}`, 'DELETE'],
    ]);
  });
  it('reports a successful forward in the shape the forward dialog reads', async () => {
    const native = vi.fn().mockResolvedValue(json({ items: [{ id: '77', chat_id: id }, { id: '78', chat_id: '5' }] }, 201));
    const response = await withGoTransport(native, base)(`${base}/messages/forward`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_message_id: '9', target_chat_ids: [id, '5'] }),
    });
    expect(native.mock.calls[0][0]).toBe(`${base}/messages/9/forward`);
    expect(JSON.parse(native.mock.calls[0][1].body)).toEqual({ chat_ids: [id, '5'] });
    expect(await response.json()).toEqual({
      forwarded: [{ chat_id: id, message_id: '77' }, { chat_id: '5', message_id: '78' }], failed: [],
    });
  });
  it('maps self-profile edits to PATCH /me without dropping authentication', async () => {
    const native = vi.fn().mockResolvedValue(json(user));
    const fetch = withGoTransport(native, base);
    const response = await fetch(`${base}/auth/me`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' }, body: JSON.stringify({ display_name: 'Alice' }) });
    const [url, init] = native.mock.calls[0];
    expect(url).toBe(`${base}/me`);
    expect(init.method).toBe('PATCH');
    expect(init.headers.get('Authorization')).toBe('Bearer test');
    expect(await response.json()).toMatchObject({ id, display_name: 'My Alice', account_display_name: 'Alice' });
  });

  it('loads every chat page and retains string IDs in screen models', async () => {
    const chat = { id, type: 'direct', name: 'Alice', peer: user, avatar_url: null, is_pinned: false, unread_count: 2, last_message: null, created_at: '2026-01-01T00:00:00Z' };
    const native = vi.fn().mockResolvedValueOnce(json({ items: [chat], next_cursor: 'page2' })).mockResolvedValueOnce(json({ items: [], next_cursor: null }));
    const response = await withGoTransport(native, base)(`${base}/chats/list/bob`);
    expect(native.mock.calls[1][0]).toContain('after=page2');
    expect(await response.json()).toMatchObject({ chats: [{ id, interlocutor_name: 'alice', unread_count: 2 }] });
  });

  it('passes backend errors through and does not turn failed lookups into empty lists', async () => {
    const native = vi.fn().mockResolvedValue(json({ code: 'unauthenticated' }, 401));
    const response = await withGoTransport(native, base)(`${base}/chats/list/bob`);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: 'unauthenticated' });
  });

  it('isolates events from other chats on the global WebSocket stream', () => {
    expect(goServerEvent({ type: 'delete', event_id: '7', chat_id: '999', data: { message_id: id, scope: 'everyone' } }, id)).toBeNull();
    expect(goServerEvent({ type: 'delete', event_id: '7', chat_id: id, data: { message_id: id, scope: 'everyone' } }, id)).toEqual({ type: 'delete', message_id: id });
  });

  it('does not truncate media after the first backend page', async () => {
    const message = { id, chat_id: '1', sender: user, content: '', attachment: null, type: 'text',
      reply_to: null, reactions: [], read_by: [], created_at: '2026-01-01T00:00:00Z', edited_at: null, is_deleted: false };
    const native = vi.fn().mockResolvedValueOnce(json({ items: [{ message }], next_cursor: 'next' }))
      .mockResolvedValueOnce(json({ items: [{ message: { ...message, id: '9007199254740994' } }], next_cursor: null }));
    const response = await withGoTransport(native, base)(`${base}/messages/photos/1`);
    expect(native.mock.calls[1][0]).toContain('after=next');
    expect((await response.json()).photos.map((photo: {id: string}) => photo.id)).toEqual([id, '9007199254740994']);
  });

  it('drops messages deleted for everyone from chat history', async () => {
    const message = { id, chat_id: '1', sender: user, content: 'hi', attachment: null, type: 'text',
      reply_to: null, reactions: [], read_by: [], created_at: '2026-01-01T00:00:00Z', edited_at: null, is_deleted: false };
    const native = vi.fn().mockResolvedValue(json({ items: [message, { ...message, id: '9', content: null, is_deleted: true }], next_cursor: null }));
    const response = await withGoTransport(native, base)(`${base}/messages/history/1`);
    expect((await response.json()).history.map((item: { id: string }) => item.id)).toEqual([id]);
  });

  it('sends the current password when starting two-factor setup', async () => {
    const native = vi.fn().mockResolvedValue(json({ secret: 'test', otpauth_uri: 'otpauth://test' }));
    await withGoTransport(native, base)(`${base}/auth/me/2fa/setup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-password' }),
    });
    expect(native.mock.calls[0][0]).toBe(`${base}/me/2fa/setup`);
    expect(JSON.parse(native.mock.calls[0][1].body)).toEqual({ password: 'test-password' });
  });
});
