import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ConnectionVerifyDialog from './ConnectionVerifyDialog';

const mocks = vi.hoisted(() => ({ claim: vi.fn(), verify: vi.fn(), copy: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/lib/copyText', () => ({ copyText: mocks.copy }));
vi.mock('@/features/connections', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/connections')>();
  const unwrap = (fn: (arg: unknown) => unknown) => (arg: unknown) => ({ unwrap: () => fn(arg) });
  return {
    ...actual,
    useClaimConnectionMutation: () => [unwrap(mocks.claim), { isLoading: false }],
    useVerifyConnectionMutation: () => [unwrap(mocks.verify), { isLoading: false }],
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.claim.mockResolvedValue({ identifier: 'example.org', code: 'messenger-verify=abcdefghijklmnop', expires_at: '2026-11-16T12:00:00Z' });
  mocks.copy.mockResolvedValue(true);
});
afterEach(cleanup);

it('claims, shows the code with instructions and connects after verifying', async () => {
  const onConnected = vi.fn(), onClose = vi.fn();
  render(<ConnectionVerifyDialog provider="website" onClose={onClose} onConnected={onConnected} />);
  fireEvent.change(screen.getByLabelText('Your domain, e.g. example.com'), { target: { value: ' Example.org ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByTestId('connection-code')).toHaveTextContent('messenger-verify=abcdefghijklmnop');
  expect(mocks.claim).toHaveBeenCalledWith({ provider: 'website', identifier: 'Example.org' });
  expect(screen.getByText(/DNS TXT record on example\.org/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Copy code'));
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledWith('messenger-verify=abcdefghijklmnop'));

  mocks.verify.mockRejectedValueOnce({ status: 422 });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The code was not found yet.');
  expect(onConnected).not.toHaveBeenCalled();

  mocks.verify.mockResolvedValueOnce({ id: '1' });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  await waitFor(() => expect(onConnected).toHaveBeenCalledWith('website'));
  expect(onClose).toHaveBeenCalled();
});

it('explains a full list and keeps the dialog closed without a provider', async () => {
  mocks.claim.mockRejectedValueOnce({ status: 409 });
  render(<ConnectionVerifyDialog provider="bluesky" onClose={vi.fn()} onConnected={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Your Bluesky handle, e.g. alice.bsky.social'), { target: { value: 'alice.bsky.social' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('You can connect up to 15 accounts.');
  cleanup();
  render(<ConnectionVerifyDialog provider={null} onClose={vi.fn()} onConnected={vi.fn()} />);
  expect(screen.queryByTestId('connection-verify-dialog')).toBeNull();
});
