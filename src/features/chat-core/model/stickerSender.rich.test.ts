import { beforeEach, expect, it, vi } from 'vitest';
import type { Message, RichSend } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { createStickerSender, richNotSentText } from './stickerSender';

const post = vi.fn();
vi.mock('@/shared/api/client', () => ({ apiClient: { POST: (...args: unknown[]) => post(...args) } }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));

const user = { id: '1', username: 'bob', display_name: 'Bob', contact_name: null, avatar_url: null, bio: null, is_online: true, last_seen: null, is_deleted: false };
const pollSend: RichSend = { type: 'poll', poll: { question: 'Lunch?', options: ['Pizza', 'Soup'], multiple_answers: false, anonymous: true } };

const setup = (reply: Message | null = null) => {
  let messages: Message[] = [];
  const setMessages = vi.fn((update: Message[] | ((previous: Message[]) => Message[])) => {
    messages = typeof update === 'function' ? update(messages) : update;
  });
  const markMessageFailed = vi.fn();
  const sender = createStickerSender({
    chatId: '5', username: 'bob', senderId: () => '1', setMessages, markMessageFailed,
    takeReply: () => reply, notSent: () => 'The sticker was not sent.', richNotSent: (send) => richNotSentText(send, en),
  });
  return { sender, markMessageFailed, messages: () => messages };
};

beforeEach(() => post.mockReset());

it('shows a poll at once and sends it over REST with its reply', async () => {
  post.mockImplementation(async (...args: unknown[]) => ({
    response: new Response(null, { status: 201 }),
    data: {
      id: '100', chat_id: '5', type: 'poll', sender: user, content: '📊 Lunch?', attachment: null, reply_to: '42', forwarded_from: null,
      reactions: [], read_by: [], created_at: '2026-11-25T10:00:00Z', edited_at: null, is_deleted: false,
      client_temp_id: (args[1] as { body: { client_temp_id: string } } | undefined)?.body.client_temp_id,
      poll: {
        question: 'Lunch?', options: [{ text: 'Pizza', voter_count: 0 }, { text: 'Soup', voter_count: 0 }], multiple_answers: false, anonymous: true,
        quiz: false, explanation: null, close_at: null, closed_at: null, total_voters: 0, my_votes: [], can_close: true, version: 1,
      },
    },
  }));
  const { sender, messages } = setup({ id: '42' } as Message);
  sender.sendRich(pollSend);
  expect(messages()[0]).toMatchObject({ type: 'message', content: '📊 Lunch?', reply_to: '42', outgoing: pollSend, poll: { question: 'Lunch?', version: 0 } });
  const [, options] = post.mock.calls[0];
  expect(options.body).toEqual({ type: 'poll', poll: pollSend.type === 'poll' ? pollSend.poll : null, client_temp_id: String(messages()[0].id), reply_to: '42' });
  await vi.waitFor(() => expect(messages()[0].id).toBe('100'));
  expect(messages()[0].poll?.can_close).toBe(true);
  expect(messages()[0].outgoing).toBeUndefined();
});

it('sends a contact without the preview user and says when it was not sent', async () => {
  post.mockRejectedValueOnce(new TypeError('offline'));
  const { sender, markMessageFailed, messages } = setup();
  sender.sendRich({ type: 'contact', contact: { user_id: '3' }, user: { id: '3', username: 'ann', display_name: 'Ann' } });
  expect(messages()[0].contact).toEqual({ user_id: '3', user: { id: '3', username: 'ann', display_name: 'Ann' } });
  expect(post.mock.calls[0][1].body).toMatchObject({ type: 'contact', contact: { user_id: '3' } });
  expect(post.mock.calls[0][1].body.user).toBeUndefined();
  await vi.waitFor(() => expect(markMessageFailed).toHaveBeenCalledWith(messages()[0].id, 'The contact was not sent.'));
});

it('resends a kept poll as a poll and never as text', async () => {
  post.mockResolvedValue({ response: new Response(null, { status: 500 }), error: {} });
  const { sender, markMessageFailed } = setup();
  const kept = { id: -9, client_temp_id: -9, content: '📊 Lunch?', outgoing: pollSend, reply_to: null } as unknown as Message;
  await sender.resend(-9, kept);
  expect(post.mock.calls[0][1].body).toMatchObject({ type: 'poll', client_temp_id: '-9' });
  expect(markMessageFailed).toHaveBeenCalledWith(-9, 'The poll was not sent.');
});
