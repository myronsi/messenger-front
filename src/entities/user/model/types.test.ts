import { describe, expect, it } from 'vitest';
import { toUser, type ApiUser } from './types';

const apiUser = (extra: Partial<ApiUser> = {}): ApiUser => ({
  id: '7348123456789012345',
  username: 'alice',
  display_name: 'Alice',
  avatar_url: '/api/v2/users/7348123456789012345/avatar?version=2',
  bio: null,
  is_online: true,
  last_seen: null,
  is_deleted: false,
  ...extra,
});

describe('toUser', () => {
  it('shows the contact name when the viewer set one, and keeps both names', () => {
    const user = toUser(apiUser({ contact_name: 'Ally' }));
    expect(user).toMatchObject({ display_name: 'Ally', account_display_name: 'Alice', contact_display_name: 'Ally' });
  });

  it('keeps the id as a string and maps nulls to the app model', () => {
    const user = toUser(apiUser());
    expect(user.id).toBe('7348123456789012345');
    expect(user.display_name).toBe('Alice');
    expect(user.contact_display_name).toBeNull();
    expect(user.bio).toBeUndefined();
    expect(user.avatar_url).toBe('/api/v2/users/7348123456789012345/avatar?version=2');
    expect(toUser(apiUser({ avatar_url: null })).avatar_url).toBeUndefined();
  });

  it('carries created_at of the signed-in user', () => {
    expect(toUser({ ...apiUser(), created_at: '2026-10-10T10:00:00Z' }).created_at).toBe('2026-10-10T10:00:00Z');
  });
});
