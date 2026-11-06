import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasskeyVerifyError, signInWithPasskey } from '@/shared/api/passkeys';
import { PasskeySignIn } from './PasskeySignIn';

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  browserSupportsWebAuthnAutofill: () => Promise.resolve(true),
  WebAuthnAbortService: { cancelCeremony: vi.fn() },
}));

vi.mock('@/shared/api/passkeys', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/passkeys')>()),
  signInWithPasskey: vi.fn(),
}));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});

const signIn = vi.mocked(signInWithPasskey);
const pending = () => new Promise<string>(() => {});
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const failedText = 'Passkey sign-in failed or was cancelled. You can use your password.';

describe('PasskeySignIn autofill', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    signIn.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-arms the autofill request before the server challenge expires', async () => {
    signIn.mockImplementation(pending);
    render(<PasskeySignIn username="" onSignedIn={() => {}} />);
    await flush();
    expect(signIn).toHaveBeenCalledTimes(1);
    const firstSignal = signIn.mock.calls[0][2];
    await act(async () => { vi.advanceTimersByTime(4 * 60 * 1000); });
    await flush();
    expect(firstSignal?.aborted).toBe(true);
    expect(signIn).toHaveBeenCalledTimes(2);
    expect(signIn).toHaveBeenLastCalledWith('', true, expect.any(AbortSignal));
  });

  it('shows the error and re-arms autofill when the picked passkey is rejected', async () => {
    signIn.mockRejectedValueOnce(new PasskeyVerifyError()).mockImplementation(pending);
    render(<PasskeySignIn username="" onSignedIn={() => {}} />);
    await flush();
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent(failedText);
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['the options request fails', new Error('Passkey sign-in is unavailable. Use your password or try again.')],
    ['the ceremony is cancelled', new DOMException('Cancelled', 'AbortError')],
  ])('stays quiet and does not loop when %s', async (_case, failure) => {
    signIn.mockRejectedValue(failure);
    render(<PasskeySignIn username="" onSignedIn={() => {}} />);
    await flush();
    await flush();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('signs in with the user returned by autofill', async () => {
    const onSignedIn = vi.fn();
    signIn.mockResolvedValueOnce('anna.k');
    render(<PasskeySignIn username="" onSignedIn={onSignedIn} />);
    await flush();
    await flush();
    expect(onSignedIn).toHaveBeenCalledWith('anna.k');
  });
});
