import { describe, expect, it } from 'vitest';
import { avatarInitial, isDefaultAvatar, letterAvatar } from './letterAvatar';

describe('letter avatars', () => {
  it('knows the default user and group pictures, not real avatars or the deleted one', () => {
    expect(isDefaultAvatar('http://localhost/static/avatars/default.jpg')).toBe(true);
    expect(isDefaultAvatar('/static/avatars/group.png')).toBe(true);
    expect(isDefaultAvatar('/static/avatars/deleted.jpg')).toBe(false);
    expect(isDefaultAvatar('/api/v2/users/3/avatar')).toBe(false);
  });

  it('uses the first letter of the display name', () => {
    expect(avatarInitial('anna')).toBe('A');
    expect(avatarInitial('  @bob')).toBe('B');
    expect(avatarInitial('Юлия')).toBe('Ю');
    expect(avatarInitial('😀 Party')).toBe('😀');
    expect(avatarInitial('')).toBe('?');
  });

  it('gives the same person the same colour and escapes the letter', () => {
    expect(letterAvatar('Anna')).toBe(letterAvatar('anna '));
    expect(decodeURIComponent(letterAvatar('<b>'))).toContain('&lt;');
    expect(letterAvatar('Anna').startsWith('data:image/svg+xml')).toBe(true);
  });
});
