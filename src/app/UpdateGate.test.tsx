import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DISMISSED_UPDATE_KEY, reportNewBuild, resetUpdateStatusForTests } from '@/shared/api/updateGate';
import { setCallActive } from '@/shared/lib/callActivity';
import UpdateGate from './UpdateGate';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@/shared/api/useServerVersionCheck', () => ({ useServerVersionCheck: vi.fn() }));
vi.mock('@/shared/lib/reloadApp', () => ({ reloadApp: vi.fn() }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { updateAvailableMessage: 'Update available', updateReload: 'Reload', updateLater: 'Later' } }),
}));

describe('UpdateGate', () => {
  beforeEach(() => {
    localStorage.clear();
    resetUpdateStatusForTests();
  });

  it('shows no banner while no update is offered', () => {
    render(<UpdateGate />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides the banner on Later and keeps it hidden for the same build after a remount', () => {
    const { unmount } = render(<UpdateGate />);
    act(() => { reportNewBuild('0.6.7+abc1234'); });
    expect(screen.getByRole('status')).toHaveTextContent('Update available');

    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISSED_UPDATE_KEY)).toBe('build:0.6.7+abc1234');

    unmount();
    resetUpdateStatusForTests();
    render(<UpdateGate />);
    act(() => { reportNewBuild('0.6.7+abc1234'); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('holds the update banner while a call is running', () => {
    render(<UpdateGate />);
    act(() => { setCallActive(true); reportNewBuild('0.6.8+def5678'); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => { setCallActive(false); });
    expect(screen.getByRole('status')).toHaveTextContent('Update available');
  });
});
