import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ConnectionIndicator } from './ConnectionIndicator';

vi.mock('@/shared/api/realtime', () => ({
  realtime: { subscribeStatus: () => () => undefined, getStatus: () => 'reconnecting', hasOpened: () => true },
}));
vi.mock('@/shared/lib/connectionNotice', () => ({ shouldShowConnectionNotice: () => true }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { reconnecting: 'Reconnecting…', connectionEnded: 'Connection ended' } }),
}));

it('shows the reconnecting banner above open windows and calls', () => {
  render(<ConnectionIndicator />);
  const banner = screen.getByRole('status');
  expect(banner).toHaveTextContent('Reconnecting…');
  expect(banner).toHaveClass('z-[1150]');
  expect(banner).not.toHaveClass('z-[100]');
});
