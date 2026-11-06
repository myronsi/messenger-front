import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RecoveryKeyComponent } from './RecoveryKeyComponent';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations, setLanguage: () => {} }) };
});
vi.mock('@/shared/api/config', () => ({ getApiBaseUrl: () => 'https://api.test/api/v2' }));

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('has no code field and asks for the second factor only when the server needs it', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(json({ code: 'two_factor_required', status: 401 }, 401))
    .mockResolvedValueOnce(json({ code: 'invalid_credentials', status: 400, detail: 'Check the code.' }, 400))
    .mockResolvedValueOnce(json({ access_token: 'token', recovery_key: 'AAAA-BBBB' }, 200));
  vi.stubGlobal('fetch', fetcher);
  render(<RecoveryKeyComponent onLoginSuccess={vi.fn()} onBackToLogin={vi.fn()} />);
  expect(screen.queryByLabelText(/backup code/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'anna' } });
  fireEvent.change(screen.getByLabelText('Recovery key'), { target: { value: 'aaaa-bbbb' } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'longpassword' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'longpassword' } });
  fireEvent.submit(screen.getByLabelText('Username').closest('form')!);
  const input = await screen.findByLabelText('Authenticator or backup code');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty('code');
  fireEvent.change(input, { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByText('Check the code.')).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toMatchObject({ username: 'anna', code: '123456' });
  await waitFor(() => expect(screen.queryByLabelText('Authenticator or backup code')).not.toBeInTheDocument());
});
