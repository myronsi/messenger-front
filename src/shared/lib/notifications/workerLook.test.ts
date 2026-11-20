// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { notificationWorker as worker } from '@/test/notificationWorker';

describe('message text and look', () => {
  it('names attachments in the chosen language instead of English text', async () => {
    const w = worker(); await w.account('1', 'https://chat.test', { api: '/api/v2', language: 'ru' });
    const shownBody = async (extra: Record<string, unknown>) => {
      await w.push({ chat_id: String(extra.message_id), title: 'Mai', preview: true, body: '', ...extra });
      return w.registration.showNotification.mock.lastCall?.[1].body;
    };
    expect(await shownBody({ message_id: '1', content_type: 'photo' })).toBe('Фото');
    expect(await shownBody({ message_id: '2', content_type: 'photo', body: 'Sea' })).toBe('Sea');
    expect(await shownBody({ message_id: '3', content_type: 'voice' })).toBe('Голосовое сообщение');
    expect(await shownBody({ message_id: '4', content_type: 'sticker', body: '😀' })).toBe('😀 Стикер');
    expect(await shownBody({ message_id: '5', content_type: 'album' })).toBe('Альбом');
    expect(await shownBody({ message_id: '6', preview: false, title: 'Messenger' })).toBe('Новое сообщение');
  });
  it('shows a group by its name with each sender on its own line', async () => {
    const w = worker(); await w.account('1', 'https://chat.test', { api: '/api/v2' });
    const group = { chat_type: 'group', chat_title: 'Family', preview: true, avatar_token: 'c.7' };
    await w.push({ ...group, title: 'Mai', body: 'hi', message_id: '1', sender_id: '5' });
    expect(w.registration.showNotification.mock.lastCall).toEqual(['Family', expect.objectContaining({
      body: 'Mai: hi', icon: 'https://chat.test/api/v2/notifications/avatar/c.7',
    })]);
    await w.push({ ...group, title: 'Bob', body: 'yo', message_id: '2', sender_id: '6' });
    expect(w.registration.showNotification.mock.lastCall).toEqual(['Family (2)', expect.objectContaining({ body: 'Mai: hi\nBob: yo' })]);
    await w.push({ ...group, chat_title: undefined, preview: false, title: 'Messenger', message_id: '3' });
    expect(w.registration.showNotification.mock.lastCall).toEqual(['Messenger (3)', expect.objectContaining({ icon: '/pwa-192x192.png' })]);
  });
  it('draws the round photo with the app badge in its corner and reuses it', async () => {
    const drawn: { x: number; y: number; width: number }[] = [];
    const context = {
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(), clip: vi.fn(), arc: vi.fn(), fill: vi.fn(), fillStyle: '',
      drawImage: (_image: unknown, x: number, y: number, width: number) => { drawn.push({ x, y, width }); },
    };
    class FakeCanvas {
      getContext() { return context; }
      async convertToBlob() { return new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }); }
    }
    const w = worker(true, {
      OffscreenCanvas: FakeCanvas, createImageBitmap: async () => ({ width: 100, height: 50 }), btoa, Blob, Uint8Array, String, Math,
    });
    w.fetch.mockImplementation(async () => new Response(new Blob([new Uint8Array([0])]), { status: 200 }));
    await w.account('1', 'https://chat.test', { api: '/api/v2' });
    await w.push({ title: 'Mai', body: 'hi', message_id: '1', preview: true, sender_id: '5', avatar_token: 'a.5' });
    const icon = w.registration.showNotification.mock.lastCall?.[1].icon;
    expect(icon).toBe(`data:image/png;base64,${btoa(String.fromCharCode(1, 2, 3))}`);
    expect(w.fetch).toHaveBeenCalledWith('https://chat.test/api/v2/notifications/avatar/a.5', expect.objectContaining({ credentials: 'omit' }));
    expect(w.fetch).toHaveBeenCalledWith('https://chat.test/maskable-icon-512x512.png', expect.anything());
    expect(drawn).toHaveLength(2);
    expect(drawn[1].x).toBeGreaterThan(drawn[0].x);
    const fetches = w.fetch.mock.calls.length;
    await w.push({ title: 'Mai', body: 'again', message_id: '2', preview: true, sender_id: '5', avatar_token: 'a.5' });
    expect(w.fetch.mock.calls.length).toBe(fetches);
  });
  it('falls back to the plain photo when it cannot be drawn', async () => {
    const w = worker(true, { OffscreenCanvas: class {}, createImageBitmap: async () => { throw new Error('broken'); } });
    w.fetch.mockImplementation(async () => new Response(null, { status: 200 }));
    await w.account('1', 'https://chat.test', { api: '/api/v2' });
    await w.push({ title: 'Mai', body: 'hi', message_id: '1', preview: true, sender_id: '5', avatar_token: 'a.5' });
    expect(w.registration.showNotification.mock.lastCall?.[1].icon).toBe('https://chat.test/api/v2/notifications/avatar/a.5');
  });
});
