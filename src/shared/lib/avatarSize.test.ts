import { describe, expect, it } from 'vitest';
import { avatarSizeFor, sizedAvatarUrl } from './avatarSize';

describe('avatar sizes', () => {
  it('picks the smallest stored size that is sharp on the screen', () => {
    expect(avatarSizeFor(40, 1)).toBe(64);
    expect(avatarSizeFor(40, 2)).toBe(128);
    expect(avatarSizeFor(96, 2)).toBe(256);
    expect(avatarSizeFor(200, 2)).toBeUndefined();
    expect(avatarSizeFor(0, 2)).toBe(128);
  });

  it('adds the size to user avatar URLs only', () => {
    expect(sizedAvatarUrl('/api/v2/users/7/avatar?rev=abc', 40)).toMatch(/\/users\/7\/avatar\?rev=abc&size=(64|128)$/);
    expect(sizedAvatarUrl('/api/v2/users/7/avatar', 20)).toMatch(/\?size=64$/);
    expect(sizedAvatarUrl('/api/v2/users/7/avatar?size=256', 20)).toBe('/api/v2/users/7/avatar?size=256');
    expect(sizedAvatarUrl('/api/v2/attachments/x/content', 40)).toBe('/api/v2/attachments/x/content');
    expect(sizedAvatarUrl('/api/v2/users/7/avatars', 40)).toBe('/api/v2/users/7/avatars');
    expect(sizedAvatarUrl(undefined, 40)).toBeUndefined();
  });
});
