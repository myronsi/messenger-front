import { describe, expect, it } from 'vitest';
import { groupModel, messageModel } from './goModels';

const user = (id: string, username: string) => ({
  id, username, display_name: username.toUpperCase(), contact_name: null, avatar_url: null, bio: null,
  is_online: false, last_seen: null, is_deleted: false,
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
