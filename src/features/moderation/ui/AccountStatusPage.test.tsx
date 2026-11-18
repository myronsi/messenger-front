import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountStatus } from '../api/moderationApi';
import { AccountStatusPage } from './AccountStatusPage';

const mocks = vi.hoisted(() => ({ status: undefined as unknown, appeal: vi.fn(), toast: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: mocks.toast }));
vi.mock('../api/moderationApi', () => ({
  useGetAccountStatusQuery: () => ({ data: mocks.status, isLoading: false, isError: false, refetch: vi.fn() }),
  useAppealAccountStatusMutation: () => [mocks.appeal, { isLoading: false }],
}));

const limited: AccountStatus = {
  status: 'limited', since: '2026-11-10T09:00:00Z', restrictions: ['start_direct', 'invite_to_group', 'call'], can_appeal: true, probation_until: null,
};

describe('AccountStatusPage', () => {
  beforeEach(() => { mocks.appeal.mockReset(); mocks.toast.mockReset(); mocks.status = limited; });

  it('shows the status, what is restricted and the probation rules', () => {
    render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.getByTestId('account-status-level')).toHaveTextContent('Limited');
    expect(screen.getByTestId('account-restrictions')).toHaveTextContent('Calling people who are not your contacts');
    expect(screen.getByText(/lowers your status by one level for 14 days/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appeal now' })).toBeEnabled();
  });

  it('has no appeal and no restrictions in good standing', () => {
    mocks.status = { status: 'good', since: null, restrictions: [], can_appeal: false, probation_until: null };
    render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.getByText('Nothing is restricted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Appeal now' })).not.toBeInTheDocument();
  });

  it('appeals and announces the probation end', async () => {
    mocks.appeal.mockReturnValue({ unwrap: () => Promise.resolve({ ...limited, status: 'warned', can_appeal: false, probation_until: '2026-12-02T09:00:00Z' }) });
    render(<AccountStatusPage onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Appeal now' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringMatching(/^Appeal accepted\. Your probation runs until .*2026/)));
  });

  it('explains a refused appeal (409)', async () => {
    mocks.appeal.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
    render(<AccountStatusPage onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Appeal now' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('You cannot appeal right now. Try again later.'));
  });

  it('disables the appeal while it is not allowed and shows a running probation', () => {
    mocks.status = { ...limited, status: 'warned', can_appeal: false, probation_until: '2026-12-02T09:00:00Z' };
    render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Appeal now' })).toBeDisabled();
    expect(screen.getByText(/^Probation until /)).toBeInTheDocument();
  });
});
