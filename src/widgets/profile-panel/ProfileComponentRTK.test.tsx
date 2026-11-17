import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import ProfileComponentRTK from './ProfileComponentRTK';

const query = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('@/features/profile', () => ({ useGetCurrentUserQuery: () => query.current }));
vi.mock('@/shared/contexts/AppearanceContext', () => ({ useAppearance: () => ({ theme: 'dark' }) }));
vi.mock('./useProfileAccountActions', () => ({
  useProfileAccountActions: () => ({ displayName: 'Myron', isVisible: true, modal: null, setModal: vi.fn(), handleLogout: vi.fn(), handleClose: vi.fn() }),
}));
vi.mock('./useProfilePanelData', () => ({
  useProfilePanelData: () => ({
    activeProfilePage: 'profile', setActiveProfilePage: vi.fn(), blockedUsers: [], requestInbox: [], pendingRequestCount: 0,
    getProfileAvatarUrl: () => '/avatar.png', getProfileMediaUrl: () => '',
  }),
}));
vi.mock('./ui/ProfileHomePage', () => ({ default: () => <div data-testid="settings-home" /> }));
vi.mock('./ui/ProfilePanelDialogs', () => ({ default: () => null }));
vi.mock('./ui/SheetFrame', () => ({ SheetFrame: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./ui/SettingsSectionNav', () => ({ SettingsSectionNav: () => null }));
vi.mock('./ui/PrivacySettingsDialog', () => ({ default: () => null }));
vi.mock('./ui/BlockedUsersSection', () => ({ default: () => null }));
vi.mock('./ui/NotificationSettingsPanel', () => ({ default: () => null }));
vi.mock('./ui/ConnectionsSettingsPage', () => ({ default: () => null }));
vi.mock('./ui/SecuritySettingsDialog', () => ({ default: () => null }));
vi.mock('./ui/ApprovalRequestsPage', () => ({ default: () => null }));
vi.mock('./ui/LanguageSettingsPage', () => ({ default: () => null }));
vi.mock('./ui/AppearanceSettingsPage', () => ({ default: () => null }));
vi.mock('./ui/AboutPage', () => ({ default: () => null }));

const renderSettings = () => render(
  <LanguageProvider><ProfileComponentRTK username="myron" onClose={vi.fn()} onLogout={vi.fn()} /></LanguageProvider>,
);

describe('ProfileComponentRTK', () => {
  beforeEach(() => { query.current = {}; });

  it('shows the saved profile when refreshing it fails offline', () => {
    query.current = { data: { username: 'myron', avatar_url: null }, error: { status: 'FETCH_ERROR' }, isLoading: false, refetch: vi.fn() };
    renderSettings();
    expect(screen.getByTestId('settings-home')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load profile')).not.toBeInTheDocument();
  });

  it('shows the error when no profile was ever loaded', () => {
    query.current = { data: undefined, error: { status: 'FETCH_ERROR' }, isLoading: false, refetch: vi.fn() };
    renderSettings();
    expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
  });
});
