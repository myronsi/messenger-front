import { describe, expect, it } from 'vitest';
import { groupModel } from './goModels';

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
