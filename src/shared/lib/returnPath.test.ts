import { describe, expect, it } from 'vitest';
import { inviteTokenFromPath, publicNameFromPath, returnPath } from './returnPath';

const token = 'Ab3'.repeat(7) + 'x';

describe('returnPath', () => {
  it.each([
    '/@anna_k', '/dm/@anna_k', `/join/${token}`, '/stickers/ABCD1234', '/emoji/ABCD1234', `/qr/${'q'.repeat(32)}`, '/chat/7',
  ])('keeps the own deep link %s', (path) => {
    expect(returnPath(path, '')).toBe(path);
    expect(returnPath('/login', '', { returnPath: path })).toBe(path);
    expect(returnPath('/register', '', { returnPath: path })).toBe(path);
  });

  it('keeps the notification query of a chat link only', () => {
    expect(returnPath('/chat/7', '?notification=1')).toBe('/chat/7?notification=1');
    expect(returnPath('/login', '', { returnPath: '/chat/7?notification=1&reply=1' })).toBe('/chat/7?notification=1&reply=1');
    expect(returnPath('/chat/7', '?next=https://outside.test')).toBe('/chat/7');
  });

  it('drops trailing slashes', () => {
    expect(returnPath('/@anna_k/', '')).toBe('/@anna_k');
  });

  it.each([
    '//outside.test', 'https://outside.test/@anna', '/@an', '/@anna-k', `/@${'a'.repeat(33)}`, '/join/short', '/settings', '/chat/0',
    '/@anna/settings', '/dm/@anna/profile', '/qr/bad',
  ])('refuses %s', (path) => {
    expect(returnPath(path, '')).toBe('/');
    expect(returnPath('/login', '', { returnPath: path })).toBe('/');
  });

  it('ignores state without a string return path', () => {
    expect(returnPath('/login', '', null)).toBe('/');
    expect(returnPath('/login', '', { returnPath: 7 })).toBe('/');
    expect(returnPath('/login', '', { notificationReturnPath: '/chat/7' })).toBe('/');
  });
});

describe('public paths', () => {
  it('reads public names and invite tokens', () => {
    expect(publicNameFromPath('/@Anna_K')).toBe('Anna_K');
    expect(publicNameFromPath('/@Anna_K/')).toBe('Anna_K');
    expect(publicNameFromPath('/@an')).toBeNull();
    expect(publicNameFromPath('/dm/@anna')).toBeNull();
    expect(inviteTokenFromPath(`/join/${token}`)).toBe(token);
    expect(inviteTokenFromPath('/join/no-good')).toBeNull();
  });
});
