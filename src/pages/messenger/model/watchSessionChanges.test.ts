import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/shared/auth/session';
import { watchSessionChanges } from './watchSessionChanges';

const tokenFor = (sub: string, exp = 1) => `header.${btoa(JSON.stringify({ sub, exp }))}.signature`;

const watch = () => {
  const onSignedOut = vi.fn();
  const onAccountChanged = vi.fn();
  const stop = watchSessionChanges({ onSignedOut, onAccountChanged });
  return { onSignedOut, onAccountChanged, stop };
};

afterEach(() => localStorage.clear());

describe('watchSessionChanges', () => {
  it('signs this tab out when the token is removed', () => {
    setAccessToken(tokenFor('1'));
    const { onSignedOut, onAccountChanged, stop } = watch();
    setAccessToken(null);
    expect(onSignedOut).toHaveBeenCalledTimes(1);
    expect(onAccountChanged).not.toHaveBeenCalled();
    stop();
  });

  it('ignores a refreshed token of the same account', () => {
    setAccessToken(tokenFor('1'));
    const { onSignedOut, onAccountChanged, stop } = watch();
    setAccessToken(tokenFor('1', 2));
    expect(onSignedOut).not.toHaveBeenCalled();
    expect(onAccountChanged).not.toHaveBeenCalled();
    stop();
  });

  it('reports a token of a different account', () => {
    setAccessToken(tokenFor('1'));
    const { onAccountChanged, stop } = watch();
    setAccessToken(tokenFor('2'));
    expect(onAccountChanged).toHaveBeenCalledTimes(1);
    stop();
  });

  it('does not treat a new sign-in after a sign-out as an account switch', () => {
    setAccessToken(tokenFor('1'));
    const { onAccountChanged, stop } = watch();
    setAccessToken(null);
    setAccessToken(tokenFor('2'));
    expect(onAccountChanged).not.toHaveBeenCalled();
    stop();
  });

  it('stops listening once stopped', () => {
    setAccessToken(tokenFor('1'));
    const { onSignedOut, stop } = watch();
    stop();
    setAccessToken(null);
    expect(onSignedOut).not.toHaveBeenCalled();
  });
});
