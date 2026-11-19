import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountStatus } from '../api/moderationApi';
import { AccountStatusPage } from './AccountStatusPage';

const mocks = vi.hoisted(() => ({ status: undefined as unknown, outcomes: undefined as unknown, appeal: vi.fn(), review: vi.fn(), toast: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: mocks.toast }));
vi.mock('../api/moderationApi', () => ({
  useGetAccountStatusQuery: () => ({ data: mocks.status, isLoading: false, isError: false, refetch: vi.fn() }),
  useAppealAccountStatusMutation: () => [mocks.appeal, { isLoading: false }],
  useRequestAccountReviewMutation: () => [mocks.review, { isLoading: false }],
  useListReportOutcomesQuery: () => ({ data: mocks.outcomes }),
}));

const limited: AccountStatus = {
  status: 'limited', since: '2026-11-10T09:00:00Z', restrictions: ['start_direct', 'invite_to_group', 'call'], can_appeal: true, probation_until: null,
  review_requested_at: null, can_request_review: true,
};

describe('AccountStatusPage', () => {
  beforeEach(() => { mocks.appeal.mockReset(); mocks.review.mockReset(); mocks.toast.mockReset(); mocks.status = limited; mocks.outcomes = undefined; });

  it('links the Community Guidelines next to the status explanation', () => {
    render(<AccountStatusPage onBack={vi.fn()} />);
    const link = screen.getByRole('link', { name: 'Community Guidelines' });
    expect(link).toHaveAttribute('href', 'https://docs.messenger.viserix.com/#/guidelines/en');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.closest('p')).toHaveTextContent('The rules are in the Community Guidelines.');
  });

  it('shows a staff decision as reviewed by a person with the rule and the text from Messenger moderation', () => {
    mocks.status = {
      ...limited, status: 'restricted', can_appeal: false, decided_by: 'staff', reason_code: 'scam',
      reason_text: 'You asked several people for money.',
    };
    render(<AccountStatusPage onBack={vi.fn()} />);
    const decision = screen.getByTestId('staff-decision');
    expect(decision).toHaveTextContent('Reviewed by a person');
    expect(decision).toHaveTextContent('Rule: Scam or fraud');
    expect(decision).toHaveTextContent('You asked several people for money.');
    expect(decision).toHaveTextContent('Messenger moderation');
    expect(screen.getByText(/A person on the moderation team reviewed your account/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be lowered by an automatic appeal/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Appeal now' })).not.toBeInTheDocument();
  });

  it('shows an unknown rule as other and no decision box for automatic statuses', () => {
    mocks.status = { ...limited, decided_by: 'staff', reason_code: 'new_rule', reason_text: null };
    const { unmount } = render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.getByTestId('staff-decision')).toHaveTextContent('Rule: Other');
    unmount();
    mocks.status = { ...limited, decided_by: 'automatic', reason_code: null, reason_text: null };
    render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.queryByTestId('staff-decision')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appeal now' })).toBeEnabled();
  });

  it('lists the outcomes of the reports the user made', () => {
    mocks.outcomes = { items: [
      { id: '2', subject_type: 'sticker_pack', subject_id: '7', outcome: 'action_taken', created_at: '2026-11-19T10:00:00Z', read: false },
      { id: '1', subject_type: 'channel', subject_id: '8', outcome: 'escalated', created_at: '2026-11-18T10:00:00Z', read: true },
    ] };
    render(<AccountStatusPage onBack={vi.fn()} />);
    const list = screen.getByTestId('report-outcomes');
    expect(list).toHaveTextContent('Your report about a sticker pack');
    expect(list).toHaveTextContent('We reviewed it and took action.');
    expect(list).toHaveTextContent('Your reportWe reviewed it.');
  });

  it('shows the status, what is restricted and the probation rules', () => {
    render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.getByTestId('account-status-level')).toHaveTextContent('Limited');
    expect(screen.getByTestId('account-restrictions')).toHaveTextContent('Calling people who are not your contacts');
    expect(screen.getByText(/lowers your status by one level for 14 days/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appeal now' })).toBeEnabled();
  });

  it('has no appeal and no restrictions in good standing', () => {
    mocks.status = { status: 'good', since: null, restrictions: [], can_appeal: false, probation_until: null, review_requested_at: null, can_request_review: false };
    render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.getByText('Nothing is restricted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Appeal now' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request a review by a person' })).not.toBeInTheDocument();
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
  it('sends a review request with the trimmed text', async () => {
    mocks.review.mockReturnValue({ unwrap: () => Promise.resolve({ ...limited, review_requested_at: '2026-11-19T10:00:00Z', can_request_review: false }) });
    render(<AccountStatusPage onBack={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Request a review by a person' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('What should the reviewer know?'), { target: { value: '  I only sent one link.  ' } });
    expect(screen.getByText('25/500')).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Request sent.'));
    expect(mocks.review).toHaveBeenCalledWith('I only sent one link.');
  });

  it('shows the sent state while a request is open', () => {
    mocks.status = { ...limited, review_requested_at: '2026-11-19T10:00:00Z', can_request_review: false };
    render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.getByTestId('review-request-sent')).toHaveTextContent('Request sent');
    expect(screen.getByTestId('review-request-sent')).toHaveTextContent(/You asked for a review on .*2026.*\. A person from the moderation team/);
    expect(screen.queryByRole('button', { name: 'Request a review by a person' })).not.toBeInTheDocument();
  });

  it('explains when no request is possible', () => {
    mocks.status = { ...limited, can_request_review: false };
    render(<AccountStatusPage onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Request a review by a person' })).toBeDisabled();
    expect(screen.getByLabelText('What should the reviewer know?')).toBeDisabled();
    expect(screen.getByText('You sent 3 requests in the last 30 days. You can ask again later.')).toBeInTheDocument();
  });

  it.each([
    [409, 'You already have an open request. Wait for the decision.'],
    [429, 'You sent 3 requests in the last 30 days. Try again later.'],
    [503, 'Could not send the request. Try again.'],
  ])('explains a refused review request (%i)', async (status, message) => {
    mocks.review.mockReturnValue({ unwrap: () => Promise.reject({ status }) });
    render(<AccountStatusPage onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('What should the reviewer know?'), { target: { value: 'please check' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request a review by a person' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(message));
  });
});
