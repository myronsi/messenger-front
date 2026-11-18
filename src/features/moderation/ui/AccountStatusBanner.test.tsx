import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountStatusBanner } from './AccountStatusBanner';

const mocks = vi.hoisted(() => ({ status: undefined as undefined | { status: string } }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('../api/moderationApi', () => ({ useGetAccountStatusQuery: () => ({ data: mocks.status }) }));

describe('AccountStatusBanner', () => {
  it.each([
    ['warned', 'Several people reported your account.'],
    ['limited', 'Your account is limited after reports.'],
    ['restricted', 'Your account is restricted after reports.'],
    ['suspended', 'Your account is read-only after reports.'],
  ])('shows the %s banner', (status, text) => {
    mocks.status = { status };
    render(<AccountStatusBanner onOpenDetails={vi.fn()} />);
    expect(screen.getByTestId('account-status-banner')).toHaveTextContent(text);
  });

  it('shows nothing in good standing or before the status is known', () => {
    mocks.status = { status: 'good' };
    const { rerender } = render(<AccountStatusBanner onOpenDetails={vi.fn()} />);
    expect(screen.queryByTestId('account-status-banner')).not.toBeInTheDocument();
    mocks.status = undefined;
    rerender(<AccountStatusBanner onOpenDetails={vi.fn()} />);
    expect(screen.queryByTestId('account-status-banner')).not.toBeInTheDocument();
  });

  it('opens the details and comes back after a dismissal when the status changes', () => {
    mocks.status = { status: 'warned' };
    const onOpenDetails = vi.fn();
    const { rerender } = render(<AccountStatusBanner onOpenDetails={onOpenDetails} />);
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(onOpenDetails).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('account-status-banner')).not.toBeInTheDocument();
    mocks.status = { status: 'limited' };
    rerender(<AccountStatusBanner onOpenDetails={onOpenDetails} />);
    expect(screen.getByTestId('account-status-banner')).toHaveAttribute('data-level', 'limited');
  });
});
