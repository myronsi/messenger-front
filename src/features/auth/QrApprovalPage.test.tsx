import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiProblem } from '@/shared/api/problem';
import { approveQrLogin, denyQrLogin, getQrLogin } from './api/qrLoginApi';
import { QrApprovalPage } from './QrApprovalPage';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations, setLanguage: () => {} }) };
});
vi.mock('./api/qrLoginApi', () => ({
  getQrLogin: vi.fn(),
  approveQrLogin: vi.fn(),
  denyQrLogin: vi.fn(),
  isQrLoginGone: (error: unknown) => (error as { status?: number })?.status === 404,
  isQrLoginUsed: (error: unknown) => (error as { status?: number })?.status === 409,
  isQrLoginForbidden: (error: unknown) => (error as { status?: number })?.status === 403,
}));

const get = vi.mocked(getQrLogin);
const approve = vi.mocked(approveQrLogin);
const deny = vi.mocked(denyQrLogin);
const requestId = 'r'.repeat(32);
const details = (status: 'pending' | 'scanned' | 'approved' | 'expired' = 'scanned') => ({
  request_id: requestId, status, device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36',
  location: { city: 'Berlin', country_code: 'DE', country: 'Germany' },
  created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 120_000).toISOString(),
});
const renderPage = (onClose = vi.fn()) => ({ onClose, ...render(<QrApprovalPage requestId={requestId} onClose={onClose} />) });

beforeEach(() => { get.mockReset(); approve.mockReset(); deny.mockReset(); });

describe('QrApprovalPage', () => {
  it('shows the requesting device, place and warning, and approves', async () => {
    get.mockResolvedValueOnce(details());
    approve.mockResolvedValueOnce(undefined);
    const { onClose } = renderPage();
    expect(await screen.findByRole('heading', { name: 'Sign in on another device?' })).toBeInTheDocument();
    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText('Berlin, Germany')).toBeInTheDocument();
    expect(screen.getByText(/Never scan a code someone sent you/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Done — the other device is signed in')).toBeInTheDocument();
    expect(approve).toHaveBeenCalledWith(requestId, undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Back to chats' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('asks for the second factor when the server needs it', async () => {
    get.mockResolvedValueOnce(details());
    approve.mockRejectedValueOnce(new ApiProblem(401, { code: 'two_factor_required', status: 401 })).mockResolvedValueOnce(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.change(await screen.findByLabelText('Authenticator or backup code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Done — the other device is signed in')).toBeInTheDocument();
    expect(approve).toHaveBeenLastCalledWith(requestId, '123456');
  });

  it('denies the request', async () => {
    get.mockResolvedValueOnce(details('pending'));
    deny.mockResolvedValueOnce(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    expect(await screen.findByText('Sign-in denied. The other device was not signed in.')).toBeInTheDocument();
    expect(deny).toHaveBeenCalledWith(requestId);
  });

  it('shows an expired code when the request is unknown', async () => {
    get.mockRejectedValueOnce(new ApiProblem(404, { code: 'not_found', status: 404 }));
    const { onClose } = renderPage();
    expect(await screen.findByText('This code has expired')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to chats' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a used code when the request was already answered', async () => {
    get.mockResolvedValueOnce(details('approved'));
    renderPage();
    expect(await screen.findByText('This code was already used')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows an expired code when it runs out before the answer arrives', async () => {
    get.mockResolvedValueOnce(details());
    approve.mockRejectedValueOnce(new ApiProblem(404, { code: 'not_found', status: 404 }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('This code has expired')).toBeInTheDocument();
  });

  it('lets the user retry when the code cannot be checked', async () => {
    get.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(details());
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument());
  });

  it('shows a used code when another device answered first', async () => {
    get.mockResolvedValueOnce(details());
    deny.mockRejectedValueOnce(new ApiProblem(409, { code: 'conflict', status: 409 }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    expect(await screen.findByText('This code was already used')).toBeInTheDocument();
  });

  it('explains when this session is too old to approve', async () => {
    get.mockResolvedValueOnce(details());
    approve.mockRejectedValueOnce(new ApiProblem(403, { code: 'forbidden', status: 403 }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("This device can't approve sign-ins. Sign in here again, then scan the code.");
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('keeps the two-factor dialog open after a wrong code', async () => {
    get.mockResolvedValueOnce(details());
    approve.mockRejectedValueOnce(new ApiProblem(401, { code: 'two_factor_required', status: 401 }))
      .mockRejectedValueOnce(new ApiProblem(400, { code: 'invalid_credentials', status: 400, detail: 'Check the code.' }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.change(await screen.findByLabelText('Authenticator or backup code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Check the code.')).toBeInTheDocument();
    expect(screen.getByLabelText('Authenticator or backup code')).toBeInTheDocument();
  });

  it('does not expire a request on a fast device clock and lets the server decide', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      get.mockResolvedValueOnce({ ...details(), expires_at: new Date(Date.now() - 3 * 60_000).toISOString() });
      approve.mockRejectedValueOnce(new ApiProblem(404, { code: 'not_found', status: 404 }));
      renderPage();
      expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
      expect(await screen.findByText('This code has expired')).toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });
});
