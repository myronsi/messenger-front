import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import UserProfileInfoPanel from './UserProfileInfoPanel';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/entities/user', () => ({
  useGetCommonGroupsQuery: vi.fn(() => ({ data: [{ id: '12', name: 'Design crew', avatar_url: null, member_count: 3 }] })),
}));

it('opens a group in common when its row is clicked', () => {
  const onOpenGroup = vi.fn();
  render(<UserProfileInfoPanel userId="5" actionError={null} isCurrentUser={false} onOpenGroup={onOpenGroup} />);
  fireEvent.click(screen.getByRole('button', { name: /Design crew/ }));
  expect(onOpenGroup).toHaveBeenCalledWith({ id: '12', name: 'Design crew', avatarUrl: undefined });
});

it('shows the bio and hides mutual groups when there are none', async () => {
  const { useGetCommonGroupsQuery } = await import('@/entities/user');
  vi.mocked(useGetCommonGroupsQuery).mockReturnValueOnce({ data: [] } as unknown as ReturnType<typeof useGetCommonGroupsQuery>);
  render(<UserProfileInfoPanel userId="5" actionError={null} isCurrentUser={false} bio="holiwis" />);
  expect(screen.getByText('Bio')).toBeInTheDocument();
  expect(screen.getByText('holiwis')).toBeInTheDocument();
  expect(screen.queryByText('Mutual groups')).not.toBeInTheDocument();
});
