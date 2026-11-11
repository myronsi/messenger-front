import { expect, it } from 'vitest';
import type { components } from '@/shared/api/generated/schema';
import { goServerEvent } from '@/shared/api/goSocket';
import { buildMessageFromSocketEvent } from './messageUpdates';
import { parseServerEvent, type NewMessageEvent } from './socketEvents';

type ServerEvent = Parameters<typeof goServerEvent>[0];

const image = { id: 'img', kind: 'image', url: '/api/v2/attachments/img/content', filename: 's.webp', content_type: 'image/webp', size: 10, width: 512, height: 512 };

const frame = {
  type: 'message', event_id: '1', chat_id: '38',
  data: {
    message: {
      id: '900', chat_id: '38', type: 'sticker', content: '🤣', created_at: '2026-11-11T00:03:02Z', edited_at: null, is_deleted: false,
      forwarded_from: null, reply_to: null, reactions: [], read_by: [], attachment: image,
      sender: { id: '7', username: 'mai', display_name: 'Mai', avatar_url: null, is_deleted: false, is_online: true, last_seen: null, bio: null },
      sticker: { id: '2', pack_id: '1', emoji: '🤣', is_animated: true, image },
    } as unknown as components['schemas']['Message'],
  },
} as unknown as ServerEvent;

it('keeps the sticker picture on a sticker that arrives live from someone else', () => {
  const event = parseServerEvent(goServerEvent(frame, '38')) as NewMessageEvent;
  const message = buildMessageFromSocketEvent(event, { currentUserId: '1', username: 'alice' });
  expect(message.sticker).toEqual(expect.objectContaining({ emoji: '🤣', image_url: '/api/v2/attachments/img/content' }));
  expect(message.is_own).toBe(false);
});
