import { describe, expect, it, vi } from 'vitest';
import { withGoTransport } from './goTransport';
import { goClientEvent, goServerEvent } from './goSocket';
import { compareIds } from './entityId';

const base = 'https://staging.example.test/api/v2';
const id = '9007199254740993';
const user = { id, username: 'alice', display_name: 'Alice', contact_name: 'My Alice', avatar_url: null, bio: null, is_online: false, last_seen: null, is_deleted: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Go migration transport', () => {
  it('keeps IDs exact in links, sorting, and outgoing WebSocket frames', () => {
    expect(compareIds(id, '9007199254740992')).toBe(1);
    expect(compareIds('10', '9')).toBe(1);
    expect(goClientEvent({ type: 'message', content: 'hello {world}', client_temp_id: -1 }, id)).toEqual({
      type: 'message', chat_id: id, client_temp_id: '-1', data: { type: 'text', content: 'hello {world}', reply_to: null },
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
});
