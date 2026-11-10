import { beforeEach, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import type { Sticker } from '@/entities/sticker';
import { createStickerSender } from './stickerSender';

const post = vi.fn();
vi.mock('@/shared/api/client', () => ({ apiClient: { POST: (...args: unknown[]) => post(...args) } }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));

const image = { id: 'img', url: '/api/v2/attachments/img/content', kind: 'image', content_type: 'image/webp', filename: 'sticker.webp', size: 10 } as Sticker['image'];
const sticker: Sticker = { id: '7', pack_id: '3', pack_slug: 'ABCDEFGHJKLM', emoji: '🐱', is_animated: false, image };
const user = { id: '1', username: 'bob', display_name: 'Bob', contact_name: null, avatar_url: null, bio: null, is_online: true, last_seen: null, is_deleted: false };

const setup = (reply: Message | null = null) => {
  let messages: Message[] = [];
  const setMessages = vi.fn((update: Message[] | ((previous: Message[]) => Message[])) => {
    messages = typeof update === 'function' ? update(messages) : update;
  });
  const markMessageFailed = vi.fn();
  const sender = createStickerSender({
    chatId: '5', username: 'bob', senderId: () => '1', setMessages, markMessageFailed,
    takeReply: () => reply, notSent: () => 'The sticker was not sent.',
  });
  return { sender, markMessageFailed, messages: () => messages };
};

beforeEach(() => post.mockReset());

it('shows the sticker at once and sends it over REST', async () => {
  const reply = { id: '42' } as Message;
  post.mockImplementation(async (...args: unknown[]) => ({
    response: new Response(null, { status: 201 }),
    data: {
      id: '100', chat_id: '5', type: 'sticker', sender: user, content: '🐱', attachment: image, sticker, reply_to: '42',
      forwarded_from: null, reactions: [], read_by: [], created_at: '2026-11-10T10:00:00Z', edited_at: null, is_deleted: false,
      client_temp_id: (args[1] as { body: { client_temp_id: string } } | undefined)?.body.client_temp_id,
    },
  }));
  const { sender, messages } = setup(reply);
  sender.send(sticker);
  expect(messages()[0]).toMatchObject({ content: '🐱', reply_to: '42', sticker: { id: '7', image_url: image.url } });
  const [path, options] = post.mock.calls[0];
  expect(path).toBe('/chats/{chat_id}/messages');
  expect(options).toMatchObject({ params: { path: { chat_id: '5' } }, body: { type: 'sticker', sticker_id: '7', reply_to: '42' } });
  expect(options.body.client_temp_id).toBe(String(messages()[0].id));
  await vi.waitFor(() => expect(messages()[0].id).toBe('100'));
  expect(messages()).toHaveLength(1);
  expect(messages()[0].sticker?.pack_slug).toBe('ABCDEFGHJKLM');
});

it('keeps a privacy reason from the server and says the sticker was not sent otherwise', async () => {
  post.mockResolvedValueOnce({ response: new Response(null, { status: 403 }), error: { detail: 'The user blocked you' } });
  const blocked = setup();
  blocked.sender.send(sticker);
  await vi.waitFor(() => expect(blocked.markMessageFailed).toHaveBeenCalledWith(blocked.messages()[0].id, 'The user blocked you'));

  post.mockResolvedValueOnce({ response: new Response(null, { status: 422 }), error: { detail: 'sticker_id is not an available sticker' } });
  const first = setup();
  first.sender.send(sticker);
  await vi.waitFor(() => expect(first.markMessageFailed).toHaveBeenCalledWith(first.messages()[0].id, 'The sticker was not sent.'));

  post.mockRejectedValueOnce(new TypeError('offline'));
  const second = setup();
  second.sender.send(sticker);
  await vi.waitFor(() => expect(second.markMessageFailed).toHaveBeenCalledWith(second.messages()[0].id, 'The sticker was not sent.'));
});
