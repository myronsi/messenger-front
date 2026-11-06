import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ publicApiClient: { POST: post, GET: get } }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: en }) }));

import { DeviceRecoveryComponent } from './DeviceRecoveryComponent';

const t = en.recoveryFlow;

afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

it('counts the request lifetime down from receipt when the device clock is fast', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  post.mockResolvedValueOnce({ data: { request_id: 'r1', match_number: 42, expires_at: new Date(Date.now() - 5 * 60_000).toISOString() } });
  get.mockResolvedValue({ data: { status: 'pending' } });
  render(<DeviceRecoveryComponent onLoginSuccess={vi.fn()} onBack={vi.fn()} initialUsername="alice" />);
  fireEvent.click(screen.getByRole('button', { name: t.requestApproval }));
  expect(await screen.findByText(t.timeLeft.replace('{time}', '10:00'))).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
  expect(screen.getByText(t.timeLeft.replace('{time}', '6:00'))).toBeInTheDocument();
});
