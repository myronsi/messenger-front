import { describe, expect, it } from 'vitest';
import { pathOutsideAuth } from './authPaths';

describe('pathOutsideAuth', () => {
  it('sends sign-in and sign-up pages to the chat list', () => {
    expect(pathOutsideAuth('/login')).toBe('/');
    expect(pathOutsideAuth('/register')).toBe('/');
    expect(pathOutsideAuth('/recover-key')).toBe('/');
  });

  it('keeps an app path that was opened on top of an auth page', () => {
    expect(pathOutsideAuth('/login/settings')).toBe('/settings');
    expect(pathOutsideAuth('/register/settings/appearance')).toBe('/settings/appearance');
  });

  it('leaves other paths alone', () => {
    expect(pathOutsideAuth('/')).toBeNull();
    expect(pathOutsideAuth('/settings')).toBeNull();
    expect(pathOutsideAuth('/loginx')).toBeNull();
    expect(pathOutsideAuth('/chat/12')).toBeNull();
  });
});
