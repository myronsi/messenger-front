import { describe, expect, it } from 'vitest';
import { directChatModel, groupChatModel, groupModel, messageModel, unsentModel } from './goModels';

const user = (id: string, username: string) => ({
  id, username, display_name: username.toUpperCase(), contact_name: null, avatar_url: null, bio: null,
  is_online: false, last_seen: null, is_deleted: false, profile_version: 0, pronouns: null, birthday: null, music: null, background: null,
});

describe('groupModel', () => {
  it('names the owner from the member list', () => {
    const group = groupModel({
      id: '5', name: 'Team', description: null, avatar_url: null, owner_id: '2', my_role: 'member',
      members: [{ user: user('1', 'bob'), role: 'member', joined_at: '2026-11-02T10:00:00Z' }, { user: user('2', 'ann'), role: 'owner', joined_at: '2026-11-02T10:00:00Z' }],
      created_at: '2026-11-02T10:00:00Z',
    } as Parameters<typeof groupModel>[0]);
    expect(group).toMatchObject({ owner_username: 'ann', owner_display_name: 'ANN', chat_id: '5' });
  });

  it('leaves the owner empty when the owner is no longer a member', () => {
    const group = groupModel({
      id: '5', name: 'Team', description: null, avatar_url: null, owner_id: '9', my_role: 'member',
      members: [{ user: user('1', 'bob'), role: 'member', joined_at: '2026-11-02T10:00:00Z' }], created_at: '2026-11-02T10:00:00Z',
    } as Parameters<typeof groupModel>[0]);
    expect(group.owner_username).toBeUndefined();
  });
});

describe('messageModel', () => {
  const message = (extra: Partial<Parameters<typeof messageModel>[0]>) => messageModel({
    id: '20', chat_id: '5', type: 'text', sender: user('1', 'bob'), content: 'answer', attachment: null, reply_to: '10',
    forwarded_from: null, reactions: [], read_by: [], created_at: '2026-11-03T10:00:00Z', edited_at: null, is_deleted: false,
    ...extra,
  } as Parameters<typeof messageModel>[0]);

  it('maps the preview of the answered message', () => {
    const mapped = message({
      reply_preview: {
        id: '10', type: 'file', sender: user('2', 'ann'), content: 'look', is_deleted: false,
        attachment: {
          id: 'a', url: '/api/v2/attachments/a/content', thumbnail_url: '/api/v2/attachments/a/content?variant=thumbnail',
          filename: 'cat.png', content_type: 'image/png', size: 10, kind: 'image', width: 4, height: 3,
        },
      } as NonNullable<Parameters<typeof messageModel>[0]['reply_preview']>,
    });
    expect(mapped.reply_preview).toMatchObject({
      id: '10', sender: 'ANN', type: 'file', is_deleted: false,
      content: { file_name: 'cat.png', caption: 'look', thumbnail_url: '/api/v2/attachments/a/content?variant=thumbnail' },
    });
  });

  it('has no preview when the server sends none', () => {
    expect(message({}).reply_preview).toBeUndefined();
  });
});

describe('messageModel system messages', () => {
  it('marks system messages so they are not offered for forwarding', () => {
    const base = {
      id: '20', chat_id: '5', type: 'text', sender: user('1', 'bob'), content: 'hi', attachment: null, reply_to: null,
      forwarded_from: null, reactions: [], read_by: [], created_at: '2026-11-03T10:00:00Z', edited_at: null, is_deleted: false,
    } as Parameters<typeof messageModel>[0];
    expect(messageModel({ ...base, type: 'system', sender: null } as Parameters<typeof messageModel>[0]).is_system).toBe(true);
    expect(messageModel(base).is_system).toBe(false);
  });
});

describe('chat unread anchor', () => {
  const chat = (extra: Partial<Parameters<typeof directChatModel>[0]>) => ({
    id: '7', type: 'direct', name: 'Bob', avatar_url: null, peer: user('1', 'bob'), is_pinned: false, unread_count: 3,
    first_unread_message_id: '7217400317439950001', last_read_message_id: '7217400317439949999', last_message: null,
    created_at: '2026-11-03T10:00:00Z',
    ...extra,
  } as Parameters<typeof directChatModel>[0]);

  it('tells whether the peer accepts voice and video, and assumes yes from an older server', () => {
    expect(directChatModel(chat({ peer: { ...user('1', 'bob'), can_send_voice_video: false } })).interlocutor_can_send_voice_video).toBe(false);
    expect(directChatModel(chat({ peer: { ...user('1', 'bob'), can_send_voice_video: true } })).interlocutor_can_send_voice_video).toBe(true);
    expect(directChatModel(chat({})).interlocutor_can_send_voice_video).toBe(true);
  });

  it('keeps the first unread message and the read marker as string IDs', () => {
    expect(directChatModel(chat({}))).toMatchObject({
      first_unread_message_id: '7217400317439950001', last_read_message_id: '7217400317439949999',
    });
    expect(groupChatModel(chat({ type: 'group', peer: null }))).toMatchObject({
      chat_id: '7', first_unread_message_id: '7217400317439950001',
    });
  });

  it('is null when nothing is unread or an older server leaves the fields out', () => {
    expect(directChatModel(chat({ unread_count: 0, first_unread_message_id: null })).first_unread_message_id).toBeNull();
    const { first_unread_message_id: _first, last_read_message_id: _read, ...older } = chat({});
    const mapped = directChatModel(older as Parameters<typeof directChatModel>[0]);
    expect(mapped.first_unread_message_id).toBeNull();
    expect(mapped.last_read_message_id).toBeNull();
  });
});

describe('messageModel stickers', () => {
  const base = {
    id: '20', chat_id: '5', type: 'text', sender: user('1', 'bob'), content: 'answer', attachment: null, reply_to: null,
    forwarded_from: null, reactions: [], read_by: [], created_at: '2026-11-03T10:00:00Z', edited_at: null, is_deleted: false,
  };

  it('keeps a sticker as its emoji with the sticker beside it, also when quoted', () => {
    const image = { id: 'img', url: '/api/v2/attachments/img/content', kind: 'image', content_type: 'image/webp', filename: 'sticker.webp', size: 10 };
    const sticker = { id: '7', pack_id: '3', pack_slug: 'ABCDEFGHJKLM', emoji: '🐱', is_animated: false, image };
    const mapped = messageModel({ ...base,
      type: 'sticker', content: '🐱', attachment: image, sticker,
      reply_preview: { id: '10', type: 'sticker', sender: user('2', 'ann'), content: '😺', attachment: image, is_deleted: false },
    } as Parameters<typeof messageModel>[0]);
    expect(mapped).toMatchObject({
      type: 'message', content: '🐱',
      sticker: { id: '7', pack_id: '3', pack_slug: 'ABCDEFGHJKLM', emoji: '🐱', image_url: '/api/v2/attachments/img/content' },
      reply_preview: { content: '😺', sticker: { emoji: '😺', image_url: '/api/v2/attachments/img/content' } },
    });
    expect(messageModel({ ...base, type: 'sticker', content: null, is_deleted: true } as Parameters<typeof messageModel>[0]).sticker).toBeUndefined();
  });
});

describe('messageModel new message types', () => {
  const base = {
    id: '30', chat_id: '5', sender: user('1', 'bob'), attachment: null, reply_to: null,
    forwarded_from: null, reactions: [], read_by: [], created_at: '2026-11-25T10:00:00Z', edited_at: null, is_deleted: false,
  };
  const poll = {
    question: 'Lunch?', options: [{ text: 'Pizza', voter_count: 2 }, { text: 'Soup', voter_count: 1 }], multiple_answers: false, anonymous: true,
    quiz: false, explanation: null, close_at: null, closed_at: null, total_voters: 3, my_votes: [0], can_close: true, version: 4,
  };
  const location = { latitude: 48.1, longitude: 11.5, accuracy_m: 25, title: 'Office', map: { url: '/api/v2/maps/static?sig=x', width: 640, height: 320 } };
  const model = (extra: object) => messageModel({ ...base, ...extra } as unknown as Parameters<typeof messageModel>[0]);

  it('carries a poll as a message with its poll', () => {
    const mapped = model({ type: 'poll', content: '📊 Lunch?', poll });
    expect(mapped).toMatchObject({ type: 'message', content: '📊 Lunch?', poll, contact: undefined, location: undefined });
  });

  it('carries a location with its map', () => {
    expect(model({ type: 'location', content: '📍 Office https://www.openstreetmap.org/', location })).toMatchObject({ type: 'message', location });
  });

  it('maps the shared person of a contact like any user', () => {
    const mapped = model({ type: 'contact', content: '👤 @ann', contact: { user_id: '2', user: { ...user('2', 'ann'), contact_name: 'Annie' } } });
    expect(mapped.contact).toMatchObject({ user_id: '2', user: { id: '2', username: 'ann', display_name: 'Annie' } });
    expect(model({ type: 'contact', content: '👤', contact: { user_id: '2', user: null } }).contact).toEqual({ user_id: '2', user: null });
  });

  it('drops the structured data of a deleted message', () => {
    expect(model({ type: 'poll', content: null, poll, is_deleted: true })).toMatchObject({ poll: undefined, contact: undefined, location: undefined });
  });

  it('keeps the place name of a quoted location but not its link', () => {
    const mapped = model({
      type: 'text', content: 'see you', reply_to: '29',
      reply_preview: { id: '29', type: 'location', sender: user('2', 'ann'), content: '📍 Office https://www.openstreetmap.org/?mlat=48.1', attachment: null, is_deleted: false },
    });
    expect(mapped.reply_preview?.content).toBe('📍 Office');
  });
});

describe('unsentModel new message types', () => {
  const kept = (extra: object) => unsentModel({
    chat_id: '5', client_temp_id: '-7', content: null, reply_to: null, attachments: [], error_code: 'forbidden', created_at: '2026-11-25T10:00:00Z',
    ...extra,
  } as unknown as Parameters<typeof unsentModel>[0]);

  it('keeps what is needed to send a poll, contact or location again', () => {
    const poll = { question: 'Lunch?', options: ['Pizza', 'Soup'], multiple_answers: false, anonymous: true };
    expect(kept({ type: 'poll', poll }).outgoing).toEqual({ type: 'poll', poll });
    expect(kept({ type: 'contact', contact: { user_id: '2' } }).outgoing).toEqual({ type: 'contact', contact: { user_id: '2' } });
    expect(kept({ type: 'location', location: { latitude: 1, longitude: 2 } }).outgoing).toEqual({ type: 'location', location: { latitude: 1, longitude: 2 } });
    expect(kept({ type: 'text', content: 'hi' }).outgoing).toBeUndefined();
  });
});
