import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import SecuritySettingsPanel from './SecuritySettingsDialog';

const settings = {
  translations: en, securityPage: en.securityPage, securitySettings: { two_factor_enabled: true, session_duration_days: 90 },
  sessionsData: { sessions: [{ id: 's1', user_agent: 'Firefox', location: null, last_active_at: '2026-11-06T10:00:00Z', is_current: true }] },
  isLoadingSecurity: false, isLoadingSessions: false, isRevokingOthers: false, isChangingPassword: false, isSettingUp2fa: false,
  isConfirming2fa: false, isDisabling2fa: false, status: null, passwordForm: { currentPassword: '', newPassword: '', confirmPassword: '' },
  setPasswordForm: vi.fn(), twoFactorSetup: null, twoFactorDialog: null, recoveryCodes: [],
  disableForm: { password: '' }, setDisableForm: vi.fn(), setupPassword: '', setSetupPassword: vi.fn(),
  isSessionDurationOpen: false, setIsSessionDurationOpen: vi.fn(), handleChangePassword: vi.fn(), handleStartTwoFactor: vi.fn(),
  handleConfirmTwoFactor: vi.fn(), handleDisableTwoFactor: vi.fn(), handleRevokeSession: vi.fn(), handleUpdateSessionDuration: vi.fn(),
  handleRevokeOtherSessions: vi.fn(),
};
const overview = {
  recovery_key: { exists: true, created_at: '2026-11-06T10:00:00Z', locked_until: null },
  other_devices: 1, passkeys: 2, passkeys_enabled: true,
  email: { address: 'person@example.test', state: 'pending', enabled: true },
};

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: en }) }));
vi.mock('./useSecuritySettings', () => ({ useSecuritySettings: () => settings }));
vi.mock('@/features/profile', () => ({
  useGetRecoveryOverviewQuery: () => ({ data: overview, isLoading: false, error: undefined, refetch: vi.fn() }),
  useGetSecurityActivityQuery: () => ({ data: [], isLoading: false, error: undefined, refetch: vi.fn() }),
}));

const onOpenDetail = vi.fn();
const onBack = vi.fn();
const renderPanel = (detail?: Parameters<typeof SecuritySettingsPanel>[0]['detail']) => render(
  <SecuritySettingsPanel isActive detail={detail} onOpenDetail={onOpenDetail} onBack={onBack} onLoggedOut={vi.fn()} onDismissSafetyChange={vi.fn()} />,
);
const row = (group: string, name: RegExp) => within(screen.getByRole('region', { name: group })).getByRole('button', { name });

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it('lists every setting as a row with a short summary', () => {
  renderPanel();
  expect(row('Sign-in', /^Password/)).toBeInTheDocument();
  expect(row('Sign-in', /^Two-factor authentication/)).toHaveTextContent('On');
  expect(row('Sign-in', /^Passkeys/)).toHaveTextContent('2 added');
  expect(row('Recovery', /^Recovery key/)).toHaveTextContent('Created 6 Nov 2026');
  expect(row('Recovery', /^Recovery email/)).toHaveTextContent('Pending');
  expect(row('Devices', /^Active sessions/)).toHaveTextContent('1 active');
  expect(screen.getByLabelText('Session duration')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
});

it('opens the matching sub-page from a row and from the health card', () => {
  renderPanel();
  fireEvent.click(row('Sign-in', /^Two-factor authentication/));
  expect(onOpenDetail).toHaveBeenLastCalledWith('two-factor');
  fireEvent.click(row('Devices', /^Active sessions/));
  expect(onOpenDetail).toHaveBeenLastCalledWith('sessions');
  fireEvent.click(screen.getAllByRole('button', { name: /^Other devices/ })[0]);
  expect(onOpenDetail).toHaveBeenLastCalledWith('sessions');
});

it('shows the setting open on its sub-page with one more breadcrumb', () => {
  renderPanel('password');
  const breadcrumb = screen.getByRole('navigation', { name: 'breadcrumb' });
  expect(within(breadcrumb).getByText('Password')).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('region', { name: 'Password' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Sign-in' })).not.toBeInTheDocument();
  fireEvent.click(within(breadcrumb).getByRole('button', { name: 'Security & devices' }));
  expect(onOpenDetail).toHaveBeenCalledWith(null);
  fireEvent.click(within(breadcrumb).getByRole('button', { name: 'Settings' }));
  expect(onBack).toHaveBeenCalled();
});

it('shows the two-factor form without a Manage toggle', () => {
  renderPanel('two-factor');
  const region = screen.getByRole('region', { name: 'Two-factor authentication' });
  expect(within(region).getByRole('button', { name: en.disable })).toBeInTheDocument();
  expect(within(region).queryByRole('button', { name: 'Manage' })).not.toBeInTheDocument();
});
