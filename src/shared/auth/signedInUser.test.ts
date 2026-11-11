import { beforeEach, describe, expect, it } from 'vitest';
import { forgetSignedInUser, readSignedInUser, rememberSignedInUser } from './signedInUser';

const tokenFor = (claims: Record<string, string>) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.s`;
const token = tokenFor({ sub: '1', sid: 's1' });

beforeEach(() => localStorage.clear());

describe('signed-in user', () => {
  it('returns the saved user only for the same account and session', () => {
    rememberSignedInUser(token, { username: 'alex', display_name: 'Alex' });
    expect(readSignedInUser(token)).toEqual({ username: 'alex', display_name: 'Alex' });
    expect(readSignedInUser(tokenFor({ sub: '1', sid: 's2' }))).toBeNull();
    expect(readSignedInUser(tokenFor({ sub: '2', sid: 's1' }))).toBeNull();
    expect(readSignedInUser(null)).toBeNull();
  });

  it('saves nothing without a session in the token or a username', () => {
    rememberSignedInUser(tokenFor({ sub: '1' }), { username: 'alex' });
    rememberSignedInUser(token, { username: '' });
    expect(localStorage.getItem('signed_in_user')).toBeNull();
  });

  it('ignores broken data and forgets the user', () => {
    localStorage.setItem('signed_in_user', '{broken');
    expect(readSignedInUser(token)).toBeNull();
    rememberSignedInUser(token, { username: 'alex' });
    forgetSignedInUser();
    expect(readSignedInUser(token)).toBeNull();
  });
});
