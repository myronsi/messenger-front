import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';

const { subscribe, post, toast, open, security, confirmWithPasskey } = vi.hoisted(() => ({
  subscribe: vi.fn(), post: vi.fn(), toast: vi.fn(), open: vi.fn(), security: { two_factor_enabled: false }, confirmWithPasskey: vi.fn(),
}));

vi.mock('@/shared/api/realtime', () => ({ realtime: { subscribe } }));
vi.mock('@/shared/api/client', () => ({ apiClient: { POST: post } }));
vi.mock('@/shared/api/passkeys', () => ({
  confirmWithPasskey, isPasskeyCancelled: (error: unknown) => error instanceof Error && error.name === 'NotAllowedError',
}));
vi.mock('@/shared/ui/sonner', () => ({ toast }));
vi.mock('@/shared/lib/useUrlOverlay', () => ({ useUrlOverlay: () => ({ open }) }));
vi.mock('@/features/profile', () => ({ useGetSecuritySettingsQuery: () => ({ data: security }) }));
vi.mock('@/features/auth', () => ({ DEVICE_RECOVERY_TTL_MS: 600_000 }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: en }) }));

import { RecoveryApprovalPrompt } from './RecoveryApprovalPrompt';

const t = en.recoveryApproval;
const request = (id: string, expiresInMs = 600_000, choices: [number, number, number] = [11, 22, 33]) => ({
  type: 'recovery_request', event_id: id, chat_id: null,
  data: { request_id: id, user_agent: '', location: null, choices, expires_at: new Date(Date.now() + expiresInMs).toISOString() },
});
const emit = (event: unknown) => act(() => {
  (subscribe.mock.lastCall?.[0] as { onEvent: (event: unknown) => void }).onEvent(event);
});
const failure = (status: number, code: string) => ({ error: { code, status }, response: { status } });
const ok = (data: unknown) => ({ data, response: { status: 200 } });
const sessionOptions = (approvableFrom?: string) => ok({ method: 'session', ...(approvableFrom ? { approvable_from: approvableFrom } : {}) });
const passkeyOptions = ok({ method: 'passkey', challenge_id: 'c'.repeat(43), public_key: { challenge: 'abc' } });
const approveWith = async (number: number) => {
  fireEvent.click(screen.getByRole('button', { name: `Choose ${number}` }));
  fireEvent.click(screen.getByRole('button', { name: t.approve }));
};

describe('RecoveryApprovalPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    security.two_factor_enabled = false;
    subscribe.mockReturnValue(() => undefined);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('opens above full-screen windows such as settings', () => {
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    expect(screen.getByRole('dialog')).toHaveClass('z-[1200]');
    expect(screen.getByRole('dialog')).not.toHaveClass('z-50');
  });

  it('shows a newer request instead of the current one without denying anything', () => {
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    expect(screen.getByRole('button', { name: 'Choose 11' })).toBeInTheDocument();
    emit(request('b', 600_000, [44, 55, 66]));
    expect(screen.getByRole('button', { name: 'Choose 44' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose 11' })).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps a just-received request on a fast device clock and expires it after the request lifetime', () => {
    vi.useFakeTimers();
    render(<RecoveryApprovalPrompt />);
    emit(request('a', -15 * 60_000));
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(9 * 60_000); });
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.queryByRole('heading', { name: t.title })).not.toBeInTheDocument();
  });

  it('closes with a notice when the request was already decided elsewhere', async () => {
    post.mockResolvedValueOnce(failure(404, 'not_found'));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    fireEvent.click(screen.getByRole('button', { name: t.deny }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: t.title })).not.toBeInTheDocument());
    expect(toast).toHaveBeenCalledWith(t.noLongerActive);
  });

  it('closes with a notice when approving a request that is no longer active', async () => {
    post.mockResolvedValueOnce(failure(404, 'not_found'));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    await approveWith(22);
    await waitFor(() => expect(screen.queryByRole('heading', { name: t.title })).not.toBeInTheDocument());
    expect(post).toHaveBeenCalledWith('/auth/recovery-requests/{requestId}/approve/options', { params: { path: { requestId: 'a' } } });
    expect(toast).toHaveBeenCalledWith(t.noLongerActive);
  });

  it('approves on a trusted session without asking for the password', async () => {
    post.mockResolvedValueOnce(sessionOptions()).mockResolvedValueOnce(ok({ status: 'approved' }));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.approve })).toBeDisabled();
    await approveWith(22);
    await waitFor(() => expect(toast).toHaveBeenCalledWith(t.approvedToast, { action: undefined }));
    expect(post).toHaveBeenLastCalledWith('/auth/recovery-requests/{requestId}/approve', { params: { path: { requestId: 'a' } }, body: { match_number: 22 } });
    expect(confirmWithPasskey).not.toHaveBeenCalled();
  });

  it('confirms with a passkey when the account has one', async () => {
    const credential = { id: 'key', response: {} };
    confirmWithPasskey.mockResolvedValueOnce(credential);
    post.mockResolvedValueOnce(passkeyOptions).mockResolvedValueOnce(ok({ status: 'approved' }));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    await approveWith(33);
    await waitFor(() => expect(toast).toHaveBeenCalledWith(t.approvedToast, { action: undefined }));
    expect(confirmWithPasskey).toHaveBeenCalledWith({ challenge: 'abc' });
    expect(post).toHaveBeenLastCalledWith('/auth/recovery-requests/{requestId}/approve', {
      params: { path: { requestId: 'a' } }, body: { match_number: 33, passkey: { challenge_id: 'c'.repeat(43), credential } },
    });
  });

  it('keeps the request open when the passkey prompt is cancelled', async () => {
    confirmWithPasskey.mockRejectedValueOnce(Object.assign(new Error('cancelled'), { name: 'NotAllowedError' }));
    post.mockResolvedValueOnce(passkeyOptions);
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    await approveWith(11);
    expect(await screen.findByRole('alert')).toHaveTextContent(t.passkeyCancelled);
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: t.approve })).toBeEnabled();
  });

  it('explains a passkey that could not be verified', async () => {
    confirmWithPasskey.mockResolvedValueOnce({ id: 'key' });
    post.mockResolvedValueOnce(passkeyOptions).mockResolvedValueOnce(failure(403, 'invalid_credentials'));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    await approveWith(11);
    expect(await screen.findByRole('alert')).toHaveTextContent(t.passkeyFailed);
  });

  it('tells a new session when it may approve instead of sending the approval', async () => {
    post.mockResolvedValueOnce(sessionOptions('2026-11-10T12:00:00Z'));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    await approveWith(11);
    expect(await screen.findByRole('alert')).toHaveTextContent(new Date('2026-11-10T12:00:00Z').toLocaleString());
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument();
  });

  it('explains when the server finds the session too new', async () => {
    post.mockResolvedValueOnce(sessionOptions()).mockResolvedValueOnce(failure(403, 'session_too_new'));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    await approveWith(11);
    expect(await screen.findByRole('alert')).toHaveTextContent(t.sessionTooNewSoon);
  });

  it('explains when this session is too old to approve', async () => {
    post.mockResolvedValueOnce(sessionOptions()).mockResolvedValueOnce(failure(403, 'forbidden'));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    await approveWith(11);
    expect(await screen.findByRole('alert')).toHaveTextContent(t.sessionTooOld);
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('drops an open two-factor confirmation when a newer request replaces the shown one', async () => {
    security.two_factor_enabled = true;
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    await approveWith(11);
    expect(await screen.findByLabelText('Authenticator or backup code')).toBeInTheDocument();
    emit(request('b', 600_000, [44, 55, 66]));
    await waitFor(() => expect(screen.queryByLabelText('Authenticator or backup code')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: t.approve })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose 55' }));
    expect(screen.getByRole('button', { name: t.approve })).toBeEnabled();
    expect(screen.getByRole('button', { name: t.deny })).toBeEnabled();
    expect(post).not.toHaveBeenCalled();
  });
});
