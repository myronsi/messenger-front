import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';

const { subscribe, post, toast, open, security } = vi.hoisted(() => ({
  subscribe: vi.fn(), post: vi.fn(), toast: vi.fn(), open: vi.fn(), security: { two_factor_enabled: false },
}));

vi.mock('@/shared/api/realtime', () => ({ realtime: { subscribe } }));
vi.mock('@/shared/api/client', () => ({ apiClient: { POST: post } }));
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

describe('RecoveryApprovalPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    security.two_factor_enabled = false;
    subscribe.mockReturnValue(() => undefined);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

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
    fireEvent.click(screen.getByRole('button', { name: 'Choose 22' }));
    fireEvent.change(screen.getByLabelText(t.password), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: t.approve }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: t.title })).not.toBeInTheDocument());
    expect(post).toHaveBeenCalledWith('/auth/recovery-requests/{requestId}/approve', expect.objectContaining({ body: { match_number: 22, password: 'correct horse' } }));
    expect(toast).toHaveBeenCalledWith(t.noLongerActive);
  });

  it('explains when this session is too old to approve', async () => {
    post.mockResolvedValueOnce(failure(403, 'forbidden'));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    fireEvent.click(screen.getByRole('button', { name: 'Choose 11' }));
    fireEvent.change(screen.getByLabelText(t.password), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: t.approve }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.sessionTooOld);
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('asks for the password and explains a wrong one', async () => {
    post.mockResolvedValueOnce(failure(403, 'invalid_credentials'));
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    fireEvent.click(screen.getByRole('button', { name: 'Choose 11' }));
    expect(screen.getByRole('button', { name: t.approve })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(t.password), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: t.approve }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.wrongPassword);
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument();
  });

  it('drops an open two-factor confirmation when a newer request replaces the shown one', async () => {
    security.two_factor_enabled = true;
    render(<RecoveryApprovalPrompt />);
    emit(request('a'));
    fireEvent.click(screen.getByRole('button', { name: 'Choose 11' }));
    fireEvent.change(screen.getByLabelText(t.password), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: t.approve }));
    expect(await screen.findByLabelText('Authenticator or backup code')).toBeInTheDocument();
    emit(request('b', 600_000, [44, 55, 66]));
    await waitFor(() => expect(screen.queryByLabelText('Authenticator or backup code')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Choose 55' }));
    expect(screen.getByLabelText(t.password)).toHaveValue('');
    expect(screen.getByRole('button', { name: t.approve })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(t.password), { target: { value: 'correct horse' } });
    expect(screen.getByRole('button', { name: t.approve })).toBeEnabled();
    expect(screen.getByRole('button', { name: t.deny })).toBeEnabled();
    expect(post).not.toHaveBeenCalled();
  });
});
