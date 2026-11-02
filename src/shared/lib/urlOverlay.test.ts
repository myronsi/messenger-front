import { describe, expect, it } from 'vitest';
import { isProfileOverlayOpen, joinOverlayPath, parentOverlay, splitOverlayPath, type UrlOverlay } from './urlOverlay';

describe('splitOverlayPath', () => {
  it.each([
    ['/', '/', null],
    ['/dm/@bob', '/dm/@bob', null],
    ['/dm/@settings', '/dm/@settings', null],
    ['/dm/@profile', '/dm/@profile', null],
    ['/chat/123', '/chat/123', null],
    ['/settings', '/', { kind: 'settings', page: 'profile' }],
    ['/settings/privacy', '/', { kind: 'settings', page: 'privacy' }],
    ['/dm/@bob/settings/notifications', '/dm/@bob', { kind: 'settings', page: 'notifications' }],
    ['/dm/@bob/profile', '/dm/@bob', { kind: 'profile' }],
    ['/chat/123/profile', '/chat/123', { kind: 'profile' }],
    ['/@alice', '/', { kind: 'user', username: 'alice' }],
    ['/chat/123/@alice', '/chat/123', { kind: 'user', username: 'alice' }],
    ['/dm/@bob/@alice', '/dm/@bob', { kind: 'user', username: 'alice' }],
    ['/dm/@bob/profile/', '/dm/@bob', { kind: 'profile' }],
    ['/chat/31/profile/@alice', '/chat/31', { kind: 'user', username: 'alice', overProfile: true }],
  ])('reads %s', (pathname, base, overlay) => {
    expect(splitOverlayPath(pathname)).toEqual({ base, overlay });
  });

  it('ignores unknown settings pages instead of opening a broken page', () => {
    expect(splitOverlayPath('/settings/unknown')).toEqual({ base: '/settings/unknown', overlay: null });
    expect(splitOverlayPath('/settings/profile').overlay).toBeNull();
    expect(splitOverlayPath('/docs/settings').overlay).toBeNull();
    expect(splitOverlayPath('/docs/profile').overlay).toBeNull();
    expect(splitOverlayPath('/docs/profile/@alice').overlay).toBeNull();
  });
});

describe('joinOverlayPath', () => {
  const cases: [string, UrlOverlay | null, string][] = [
    ['/', { kind: 'settings', page: 'profile' }, '/settings'],
    ['/dm/@bob', { kind: 'settings', page: 'security' }, '/dm/@bob/settings/security'],
    ['/chat/123', { kind: 'profile' }, '/chat/123/profile'],
    ['/', { kind: 'user', username: '@ann marie' }, '/@ann%20marie'],
    ['/dm/@bob', null, '/dm/@bob'],
    ['/', null, '/'],
  ];
  it.each(cases)('builds %s + %j', (base, overlay, expected) => {
    expect(joinOverlayPath(base, overlay)).toBe(expected);
    expect(splitOverlayPath(expected)).toEqual({ base, overlay: overlay?.kind === 'user' ? { kind: 'user', username: 'ann marie' } : overlay });
  });
});

describe('stacked profiles', () => {
  it('builds a member profile on top of the group profile', () => {
    expect(joinOverlayPath('/chat/31', { kind: 'user', username: 'alice', overProfile: true })).toBe('/chat/31/profile/@alice');
  });

  it('keeps the group profile open under a member profile and returns to it', () => {
    const member: UrlOverlay = { kind: 'user', username: 'alice', overProfile: true };
    expect(isProfileOverlayOpen(member)).toBe(true);
    expect(isProfileOverlayOpen({ kind: 'user', username: 'alice' })).toBe(false);
    expect(parentOverlay(member)).toEqual({ kind: 'profile' });
    expect(parentOverlay({ kind: 'profile' })).toBeNull();
  });
});
