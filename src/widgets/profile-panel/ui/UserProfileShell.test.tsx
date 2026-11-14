import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { UserProfileShell, UserProfileState } from './UserProfileShell';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { userProfile: 'User profile', accountDeletedOrUnavailable: 'Unavailable' } }),
}));

it('closes with the back arrow and keeps clicks inside the profile', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<UserProfileShell onClose={onClose}><button type="button">Profile action</button></UserProfileShell>);
  await user.click(screen.getByText('Profile action'));
  expect(onClose).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(onClose).toHaveBeenCalledOnce();
});

it('shows the unavailable state, and nothing once the profile is available', () => {
  const { rerender } = render(<UserProfileState isLoading={false} unavailable onClose={vi.fn()} />);
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  rerender(<UserProfileState isLoading={false} unavailable={false} onClose={vi.fn()} />);
  expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
});

it('shows the banner-style skeleton while the profile loads', () => {
  render(<UserProfileState isLoading unavailable={false} onClose={vi.fn()} />);
  expect(screen.getByTestId('user-profile-skeleton')).toBeInTheDocument();
});
