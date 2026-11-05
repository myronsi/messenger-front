import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { UserProfileLayer } from './UserProfileLayer';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { userProfile: 'User profile' } }) }));

it('closes on a press on the backdrop and keeps presses inside the profile', () => {
  const onClose = vi.fn();
  render(<UserProfileLayer isMobile={false} isClosing={false} onClose={onClose}><button type="button">Profile action</button></UserProfileLayer>);
  fireEvent.mouseDown(screen.getByText('Profile action'));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.mouseDown(screen.getByTestId('user-profile-backdrop'));
  expect(onClose).toHaveBeenCalledOnce();
});

it('does not let clicks reach the chat behind the open profile', async () => {
  const user = userEvent.setup();
  const behind = vi.fn();
  render(
    <>
      <a href="#chat" onClick={behind}>Link in chat</a>
      <UserProfileLayer isMobile={false} isClosing={false} onClose={vi.fn()}><p>Profile</p></UserProfileLayer>
    </>,
  );
  await user.click(screen.getByText('Link in chat')).catch(() => undefined);
  expect(behind).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'User profile' })).toBeInTheDocument();
});
