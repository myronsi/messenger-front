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

const t = en.mainNav;

describe('MainNav', () => {
  it('marks the active tab and reports the tab the user picks', () => {
    const onSelect = vi.fn();
    render(<MainNav variant="rail" active="calls" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: new RegExp(t.calls) })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText(t.soon)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(t.settings) })).toHaveTextContent('3');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.settings) }));
    expect(onSelect).toHaveBeenCalledWith('settings');
  });

  it('takes settings and profile from the URL and keeps chats and calls local', () => {
    const showRouteTab = vi.fn();
    const { result, rerender } = renderHook(({ routeTab }: { routeTab: 'settings' | 'profile' | null }) => useMainTab({ routeTab, showRouteTab }),
      { initialProps: { routeTab: null as 'settings' | 'profile' | null } });
    expect(result.current.active).toBe('chats');
    act(() => result.current.select('calls'));
    expect(showRouteTab).toHaveBeenLastCalledWith(null);
    expect(result.current.active).toBe('calls');
    act(() => result.current.select('profile'));
    expect(showRouteTab).toHaveBeenLastCalledWith('profile');
    rerender({ routeTab: 'profile' });
    expect(result.current.active).toBe('profile');
    rerender({ routeTab: 'settings' });
    expect(result.current.active).toBe('settings');
  });
});
