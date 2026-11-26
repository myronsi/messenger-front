import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import MainNav from './MainNav';
import { useMainTab } from '../model/mainTab';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/features/profile', () => ({ useGetCurrentUserQuery: () => ({ data: { username: 'me', display_name: 'Me' } }) }));
vi.mock('@/entities/chat', () => ({ useGetApprovalRequestInboxQuery: () => ({ data: { unread_count: 3 } }) }));
const profileQuery = vi.hoisted(() => vi.fn());
vi.mock('@/entities/user', () => ({ useGetUserByUsernameQuery: profileQuery }));

const t = en.mainNav;

describe('MainNav', () => {
  it('marks the active tab and reports the tab the user picks', () => {
    const onSelect = vi.fn();
    render(<MainNav variant="rail" active="profile" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: new RegExp(t.profile) })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: new RegExp(t.chats) })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: new RegExp(t.settings) })).not.toHaveTextContent('3');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.settings) }));
    expect(onSelect).toHaveBeenCalledWith('settings');
  });

  it('fills only the icon of the active tab', () => {
    const { rerender } = render(<MainNav variant="rail" active="chats" onSelect={vi.fn()} />);
    const icon = (name: string) => screen.getByRole('button', { name: new RegExp(name) }).querySelector('svg');
    expect(icon(t.chats)).toHaveAttribute('fill', 'currentColor');
    expect(screen.queryByTestId('settings-icon-filled')).not.toBeInTheDocument();
    rerender(<MainNav variant="bar" active="settings" onSelect={vi.fn()} />);
    expect(icon(t.chats)).toHaveAttribute('fill', 'none');
    expect(screen.getByTestId('settings-icon-filled')).toBeInTheDocument();
  });

  it('keeps the own profile loaded so the profile tab opens without waiting', () => {
    render(<MainNav variant="rail" active="chats" onSelect={vi.fn()} />);
    expect(profileQuery).toHaveBeenCalledWith('me', { skip: false });
  });

  it('puts settings and profile at the bottom of the rail but not of the bar', () => {
    const { rerender } = render(<MainNav variant="rail" active="chats" onSelect={vi.fn()} />);
    const names = screen.getAllByRole('button').map((button) => button.textContent);
    expect(names.map((name) => name?.replace(/\d+/, ''))).toEqual([t.chats, t.settings, t.profile]);
    expect(screen.getByRole('button', { name: new RegExp(t.settings) })).toHaveClass('mt-auto');
    rerender(<MainNav variant="bar" active="chats" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: new RegExp(t.settings) })).not.toHaveClass('mt-auto');
  });

  it('takes settings and profile from the URL and keeps chats local', () => {
    const showRouteTab = vi.fn();
    const { result, rerender } = renderHook(({ routeTab }: { routeTab: 'settings' | 'profile' | null }) => useMainTab({ routeTab, showRouteTab }),
      { initialProps: { routeTab: null as 'settings' | 'profile' | null } });
    expect(result.current.active).toBe('chats');
    act(() => result.current.select('profile'));
    expect(showRouteTab).toHaveBeenLastCalledWith('profile');
    rerender({ routeTab: 'profile' });
    expect(result.current.active).toBe('profile');
    rerender({ routeTab: 'settings' });
    expect(result.current.active).toBe('settings');
    act(() => result.current.select('chats'));
    expect(showRouteTab).toHaveBeenLastCalledWith(null);
    rerender({ routeTab: null });
    expect(result.current.active).toBe('chats');
  });
});
