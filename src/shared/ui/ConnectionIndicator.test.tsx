import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ConnectionIndicator } from './ConnectionIndicator';

vi.mock('@/shared/api/realtime', () => ({
  realtime: { subscribeStatus: () => () => undefined, getStatus: () => 'reconnecting', hasOpened: () => true },
}));
vi.mock('@/shared/lib/connectionNotice', () => ({ shouldShowConnectionNotice: () => true }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { reconnecting: 'Reconnecting…', connectionEnded: 'Connection ended', waitingForNetwork: 'Waiting for network…' } }),
}));

it('shows the reconnecting banner above open windows and calls', () => {
  render(<ConnectionIndicator />);
  const banner = screen.getByRole('status');
  expect(banner).toHaveTextContent('Reconnecting…');
  expect(banner).toHaveClass('z-[1150]');
  expect(banner).not.toHaveClass('z-[100]');
});

afterEach(() => vi.restoreAllMocks());

it('says the app waits for the network while the device is offline and updates when it comes back', () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  render(<ConnectionIndicator />);
  expect(screen.getByRole('status')).toHaveTextContent('Waiting for network…');
  online.mockReturnValue(true);
  act(() => { window.dispatchEvent(new Event('online')); });
  expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…');
});
