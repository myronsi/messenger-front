import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import UserProfileConnections from './UserProfileConnections';

const mocks = vi.hoisted(() => ({ items: [] as unknown[], query: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/features/connections', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/connections')>();
  return {
    ...actual,
    useGetUserConnectionsQuery: (id: string, options: { skip: boolean }) => {
      mocks.query(id, options);
      return { data: options.skip ? undefined : mocks.items };
    },
  };
});

afterEach(cleanup);

it('shows each account with its icon and a safe outside link', () => {
  mocks.items = [
    { id: '1', provider: 'github', display_name: 'octo', profile_url: 'https://github.com/octo', verified_at: '' },
    { id: '2', provider: 'xbox', display_name: 'Gamer', profile_url: null, verified_at: '' },
  ];
  render(<UserProfileConnections userId="42" />);
  expect(mocks.query).toHaveBeenCalledWith('42', { skip: false });
  const chips = screen.getAllByTestId('profile-connection');
  expect(chips[0]).toHaveAttribute('href', 'https://github.com/octo');
  expect(chips[0]).toHaveAttribute('target', '_blank');
  expect(chips[0]).toHaveAttribute('rel', 'noopener noreferrer');
  expect(chips[1].tagName).toBe('SPAN');
  expect(screen.getByTestId('provider-icon-xbox')).toBeInTheDocument();
});

it('renders nothing without accounts or without a user', () => {
  mocks.items = [];
  const { container } = render(<UserProfileConnections userId="42" />);
  expect(container).toBeEmptyDOMElement();
  render(<UserProfileConnections />);
  expect(mocks.query).toHaveBeenLastCalledWith('', { skip: true });
});
