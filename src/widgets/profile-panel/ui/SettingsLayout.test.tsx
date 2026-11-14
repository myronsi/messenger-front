import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Globe, Inbox, Shield } from 'lucide-react';
import { en } from '@/shared/lang/en';
import ProfileHomePage from './ProfileHomePage';
import { SettingsSectionNav } from './SettingsSectionNav';
import { DeleteAccountZone } from './DeleteAccountZone';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => null }));
vi.mock('@/entities/user', () => ({ useGetUserAvatarHistoryQuery: () => ({ data: undefined }) }));

const t = en.appShell;

describe('settings layout', () => {
  it('shows the phone home with setting rows and log out, without the personal info card', () => {
    const privacy = vi.fn();
    const logout = vi.fn();
    render(<ProfileHomePage handleLogout={logout} isLoggingOut={false}
      sections={[[{ label: 'Privacy', description: '', icon: Shield, onClick: privacy }], [{ label: 'Language', description: 'English', icon: Globe }]]} />);
    expect(screen.queryByText(t.addBio)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.editProfile })).not.toBeInTheDocument();
    expect(screen.queryByText(t.deleteAccountLocation)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Privacy/ }));
    fireEvent.click(screen.getByRole('button', { name: t.logOut }));
    expect([privacy, logout].map((fn) => fn.mock.calls.length)).toEqual([1, 1]);
    expect(screen.queryByRole('button', { name: /Create Group|Scan QR|Delete Account/ })).not.toBeInTheDocument();
  });

  it('marks the open section in the desktop section list and switches sections', () => {
    const select = vi.fn();
    render(<SettingsSectionNav avatarUrl="" displayName="Myron" username="myron" active="privacy" onSelect={select} onLogout={vi.fn()} isLoggingOut={false}
      sections={[{ page: 'requests', label: t.messageRequests, icon: Inbox, badge: 2 }, { page: 'privacy', label: 'Privacy', icon: Shield }]} />);
    expect(screen.getByRole('navigation', { name: t.settingsSections })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Privacy' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.messageRequests) }));
    expect(select).toHaveBeenCalledWith('requests');
    expect(screen.getByRole('button', { name: t.logOut })).toBeInTheDocument();
  });

  it('keeps account deletion in its own danger zone', () => {
    const remove = vi.fn();
    render(<DeleteAccountZone onDelete={remove} isDeleting={false} />);
    expect(screen.getByRole('region', { name: en.deleteAccount })).toHaveTextContent(t.deleteAccountHint);
    fireEvent.click(screen.getByRole('button', { name: en.deleteAccount }));
    expect(remove).toHaveBeenCalledOnce();
  });
});
