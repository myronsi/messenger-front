import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { registerPasskey } from '@/shared/api/passkeys';
import { ApiProblem } from '@/shared/api/problem';
import { PasskeyOffer } from './PasskeyOffer';

vi.mock('@simplewebauthn/browser', () => ({ browserSupportsWebAuthn: () => true }));
vi.mock('@/shared/api/passkeys', () => ({ registerPasskey: vi.fn() }));
vi.mock('@/shared/api/client', () => ({
  apiClient: { GET: vi.fn(async () => ({ data: { passkeys_enabled: true } })) },
}));

const renderOffer = (knownPassword?: string) => render(
  <LanguageProvider><PasskeyOffer username="maya" knownPassword={knownPassword} onDone={vi.fn()} /></LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('language', 'en');
  vi.mocked(registerPasskey).mockReset();
});

describe('PasskeyOffer', () => {
  it('uses the password from sign-up instead of asking again', async () => {
    vi.mocked(registerPasskey).mockResolvedValue(undefined);
    const { container } = renderOffer('Secret-123');
    const form = await waitFor(() => { const found = container.querySelector('form'); expect(found).not.toBeNull(); return found as HTMLFormElement; });
    expect(container.querySelector('#offer-passkey-password')).toBeNull();
    fireEvent.submit(form);
    await waitFor(() => expect(registerPasskey).toHaveBeenCalledWith(expect.objectContaining({ password: 'Secret-123' })));
  });

  it('asks for the password when the saved one is refused', async () => {
    vi.mocked(registerPasskey).mockRejectedValue(new ApiProblem(403, null, 'Wrong password'));
    const { container } = renderOffer('Secret-123');
    const form = await waitFor(() => { const found = container.querySelector('form'); expect(found).not.toBeNull(); return found as HTMLFormElement; });
    fireEvent.submit(form);
    await waitFor(() => expect(container.querySelector('#offer-passkey-password')).not.toBeNull());
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong password');
  });

  it('asks for the password when none is known', async () => {
    const { container } = renderOffer();
    await waitFor(() => expect(container.querySelector('#offer-passkey-password')).not.toBeNull());
  });
});
