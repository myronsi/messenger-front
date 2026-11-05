import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { UserProfileShell, UserProfileState } from './UserProfileShell';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { userProfile: 'User profile', accountDeletedOrUnavailable: 'Unavailable' } }),
}));

it('closes on an outside pointer press while clicks inside the profile stay inside', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<UserProfileShell onClose={onClose}><button>Profile action</button></UserProfileShell>);
  await user.click(screen.getByText('Profile action'));
  expect(onClose).not.toHaveBeenCalled();
  await user.pointer({ target: document.documentElement, keys: '[MouseLeft]' });
  expect(onClose).toHaveBeenCalledOnce();
});

it.each([true, false])('also closes outside while the profile is loading or unavailable (%s)', async (isLoading) => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<UserProfileState isLoading={isLoading} unavailable onClose={onClose} />);
  await user.pointer({ target: document.documentElement, keys: '[MouseLeft]' });
  expect(onClose).toHaveBeenCalledOnce();
});
