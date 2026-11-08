import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

let activity: { id: string; type: string; user_agent: string; location: null; created_at: string }[] = [];

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: en }) }));
vi.mock('./useSecuritySettings', () => ({ useSecuritySettings: () => settings }));
vi.mock('@/features/profile', () => ({
  useGetRecoveryOverviewQuery: () => ({ data: overview, isLoading: false, error: undefined, refetch: vi.fn() }),
  useGetSecurityActivityQuery: () => ({ data: activity, isLoading: false, error: undefined, refetch: vi.fn() }),
  useGetCurrentUserQuery: () => ({ data: { username: 'alice' } }),
  useGetRecoveryKeyStatusQuery: () => ({ data: { exists: true, created_at: null, locked_until: null }, error: undefined }),
  useGetSecuritySettingsQuery: () => ({ data: { two_factor_enabled: false } }),
  recoveryApi: { util: { invalidateTags: (tags: string[]) => ({ type: 'invalidate', tags }) } },
}));
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ apiClient: { POST: post } }));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => vi.fn() }));

const onOpenDetail = vi.fn();
const onBack = vi.fn();
const renderPanel = (detail?: Parameters<typeof SecuritySettingsPanel>[0]['detail']) => render(
  <SecuritySettingsPanel isActive detail={detail} onOpenDetail={onOpenDetail} onBack={onBack} onLoggedOut={vi.fn()} onDismissSafetyChange={vi.fn()}
    onDeleteAccount={vi.fn()} isDeletingAccount={false} />,
);
const row = (group: string, name: RegExp) => within(screen.getByRole('region', { name: group })).getByRole('button', { name });

beforeEach(() => {
  vi.clearAllMocks();
  activity = [];
});
afterEach(cleanup);

it('lists every setting as a row with a short summary', () => {
  renderPanel();
  expect(row('Sign-in', /^Password/)).toBeInTheDocument();
  expect(row('Sign-in', /^Two-factor authentication/)).toHaveTextContent('On');
  expect(row('Sign-in', /^Passkeys/)).toHaveTextContent('2 added');
  expect(row('Recovery', /^Recovery key/)).toHaveTextContent('Created 6 Nov 2026');
  expect(row('Recovery', /^Recovery email/)).toHaveTextContent('Pending');
  expect(row('Devices', /^Active sessions/)).toHaveTextContent('1 other device');
  expect(screen.getByLabelText('Sign out unused devices after')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
});

it('opens the matching sub-page from a row and from the health card', () => {
  renderPanel();
  fireEvent.click(row('Sign-in', /^Two-factor authentication/));
  expect(onOpenDetail).toHaveBeenLastCalledWith('two-factor');
  fireEvent.click(row('Devices', /^Active sessions/));
  expect(onOpenDetail).toHaveBeenLastCalledWith('sessions');
});

it('shows each way back in once, as a marked row instead of a tile', () => {
  renderPanel();
  expect(screen.queryByRole('button', { name: /^Other devices/ })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Recovery key/ })).toHaveLength(1);
  expect(row('Recovery', /^Recovery key/)).toHaveTextContent('Recovery: Ready');
  expect(row('Recovery', /^Recovery email/)).toHaveTextContent('Recovery: Not set up');
  expect(row('Sign-in', /^Passkeys/)).toHaveTextContent('Recovery: Ready');
  expect(row('Devices', /^Active sessions/)).toHaveTextContent('Recovery: Ready');
  expect(row('Sign-in', /^Password/)).not.toHaveTextContent('Recovery:');
});

it('shows the setting open on its sub-page with one more breadcrumb', () => {
  renderPanel('password');
  const breadcrumb = screen.getByRole('navigation', { name: 'breadcrumb' });
  expect(within(breadcrumb).getByText('Password')).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('region', { name: 'Password' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Sign-in' })).not.toBeInTheDocument();
  fireEvent.click(within(breadcrumb).getByRole('button', { name: 'Security & devices' }));
  expect(onOpenDetail).toHaveBeenCalledWith(null);
  expect(within(breadcrumb).queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  cleanup();
  renderPanel();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(onBack).toHaveBeenCalled();
});

it('shows the two-factor form without a Manage toggle', () => {
  renderPanel('two-factor');
  const region = screen.getByRole('region', { name: 'Two-factor authentication' });
  expect(within(region).getByRole('button', { name: en.disable })).toBeInTheDocument();
  expect(within(region).queryByRole('button', { name: 'Manage' })).not.toBeInTheDocument();
});

it('keeps a new recovery key on screen when the security page changes until it is confirmed', async () => {
  const key = 'ABCD-EFGH-JKLM-NPQR';
  post.mockResolvedValueOnce({ data: { recovery_key: key }, error: undefined, response: { status: 200 } });
  const onDismissSafetyChange = vi.fn();
  const props = { isActive: true, onOpenDetail, onBack, onLoggedOut: vi.fn(), onDismissSafetyChange, onDeleteAccount: vi.fn(), isDeletingAccount: false };
  const { rerender } = render(<SecuritySettingsPanel {...props} detail="recovery-key" />);
  fireEvent.change(screen.getByLabelText(en.securityPage.currentPassword), { target: { value: 'secret' } });
  fireEvent.click(screen.getByRole('button', { name: en.securityPage.keyReplace }));
  expect(await screen.findByTestId('recovery-key')).toHaveTextContent(key);
  rerender(<SecuritySettingsPanel {...props} detail="sessions" />);
  expect(screen.getByTestId('recovery-key')).toHaveTextContent(key);
  rerender(<SecuritySettingsPanel {...props} detail={undefined} />);
  expect(screen.getByTestId('recovery-key')).toHaveTextContent(key);
  expect(onDismissSafetyChange).toHaveBeenLastCalledWith(true);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:receipt');
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.click(screen.getByRole('button', { name: en.recoveryReceipt.download }));
  fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(en.recoveryReceipt.savedCheck) }));
  fireEvent.click(screen.getByRole('button', { name: en.recoveryReceipt.continue }));
  await waitFor(() => expect(screen.queryByTestId('recovery-key')).not.toBeInTheDocument());
  expect(onDismissSafetyChange).toHaveBeenLastCalledWith(false);
  expect(row('Sign-in', /^Password/)).toBeInTheDocument();
});

it('opens security activity as its own sub-page with the sign-out action', () => {
  activity = [{ id: 'e1', type: 'login', user_agent: 'Firefox', location: null, created_at: '2026-11-06T10:00:00Z' }];
  renderPanel();
  expect(row('Devices', /^Security activity/)).toHaveTextContent('Signed in');
  expect(screen.queryByRole('button', { name: en.signOutOtherDevices })).not.toBeInTheDocument();
  fireEvent.click(row('Devices', /^Security activity/));
  expect(onOpenDetail).toHaveBeenLastCalledWith('activity');
  cleanup();
  renderPanel('activity');
  const breadcrumb = screen.getByRole('navigation', { name: 'breadcrumb' });
  expect(within(breadcrumb).getByText('Security activity')).toHaveAttribute('aria-current', 'page');
  expect(within(screen.getByRole('list', { name: 'Security activity' })).getAllByRole('listitem')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: en.signOutOtherDevices }));
  expect(settings.handleRevokeOtherSessions).toHaveBeenCalled();
});
