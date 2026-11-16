import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import UserProfileInfoPanel from './UserProfileInfoPanel';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('./UserProfileConnections', () => ({ default: () => <div data-testid="profile-connections-slot" /> }));
vi.mock('@/entities/message', () => ({
  formatAudioTime: (value: number) => `0:${String(Math.round(value)).padStart(2, '0')}`,
  playAudio: vi.fn(), pauseAudio: vi.fn(), useAudioPlayer: () => false,
}));
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

it('shows the birthday chip and plays the profile music', async () => {
  const { playAudio } = await import('@/entities/message');
  const music = {
    title: 'Song', artist: 'Band',
    attachment: { id: 'a1', kind: 'audio' as const, filename: 'music.m4a', content_type: 'audio/mp4', size: 1, url: '/api/v2/attachments/a1/content', duration_ms: 20000 },
  };
  render(<UserProfileInfoPanel userId="5" actionError={null} isCurrentUser={false} ownerName="Anna"
    birthday={{ day: 3, month: 7, year: null }} music={music} />);
  expect(screen.getByTestId('profile-birthday')).toHaveTextContent('Birthday 3 July');
  expect(screen.getByText('Song')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(playAudio).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', src: '/api/v2/attachments/a1/content', title: 'Band – Song', kind: 'music', duration: 20 }));
});
