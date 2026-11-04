import { describe, expect, it } from 'vitest';
import { buildAvatarList } from './avatarHistoryList';

const current = 'http://127.0.0.1:8080/api/v2/users/73/avatar';
const item = (id: string, version: string, is_current: boolean) => ({
  id, avatar_url: `/api/v2/users/73/avatar?version=${version}`, created_at: '2026-11-02T09:59:07Z', is_current,
});

describe('buildAvatarList', () => {
  it('does not repeat the current avatar when the history links it by version', () => {
    expect(buildAvatarList([item('2', '2', true)], current).map((avatar) => avatar.id)).toEqual(['2']);
  });

  it('links the current avatar by the address the profile already shows, so the viewer opens it from the cache', () => {
    const result = buildAvatarList([item('2', '2', true), item('1', '1', false)], current);
    expect(result.map((avatar) => avatar.fullUrl)).toEqual([current, expect.stringContaining('version=1')]);
  });

  it('adds the current avatar when the history does not contain it yet', () => {
    const result = buildAvatarList([item('1', '1', false)], current);
    expect(result.map((avatar) => avatar.fullUrl)).toEqual([current, expect.stringContaining('version=1')]);
  });
});
