import { afterEach, describe, expect, it } from 'vitest';
import { setAccessToken } from '@/shared/auth/session';
import { rememberSignedInUser } from '@/shared/auth/signedInUser';
import { sessionScope } from './indexedStore';

const tokenFor = (claims: Record<string, string>) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.s`;

afterEach(() => {
  setAccessToken(null);
  localStorage.clear();
});

describe('sessionScope', () => {
  it('uses the remembered session before the refresh returns a token, and the same scope after it', () => {
    const token = tokenFor({ sub: '1', sid: 's1' });
    rememberSignedInUser(token, { username: 'alex' });
    setAccessToken(null);
    localStorage.setItem('had_session', '1');
    const before = sessionScope();
    expect(before).not.toBeNull();
    setAccessToken(token);
    expect(sessionScope()).toBe(before);
  });

  it('has no scope when no session is expected', () => {
    rememberSignedInUser(tokenFor({ sub: '1', sid: 's1' }), { username: 'alex' });
    setAccessToken(null);
    expect(sessionScope()).toBeNull();
  });
});
