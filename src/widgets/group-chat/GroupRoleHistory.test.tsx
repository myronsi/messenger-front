import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import GroupRoleHistory from './GroupRoleHistory';

const query = vi.fn();
vi.mock('@/entities/chat', () => ({ useGetGroupRoleLogQuery: (...args: unknown[]) => query(...args) }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', translations: {
    roleMadeAdmin: '{actor} made {target} an admin', roleHistory: 'Role history', roleHistoryEmpty: 'No role changes yet', roleHistoryError: "Couldn't load the role history", loading: 'Loading...',
  } }),
}));

beforeEach(() => query.mockReset());

it('tells a failed request apart from an empty history', () => {
  query.mockReturnValue({ currentData: undefined, isError: true, refetch: vi.fn() });
  const view = render(<GroupRoleHistory chatId="5" rolesKey="a" />);
  expect(screen.getByText("Couldn't load the role history")).toBeInTheDocument();
  expect(screen.queryByText('No role changes yet')).not.toBeInTheDocument();

  query.mockReturnValue({ currentData: undefined, isError: false, refetch: vi.fn() });
  view.rerender(<GroupRoleHistory chatId="5" rolesKey="b" />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  query.mockReturnValue({ currentData: { items: [] }, isError: false, refetch: vi.fn() });
  view.rerender(<GroupRoleHistory chatId="5" rolesKey="c" />);
  expect(screen.getByText('No role changes yet')).toBeInTheDocument();
});

it('shows custom emoji in the names of the role log', () => {
  query.mockReturnValue({ currentData: { items: [{
    id: '1', role: 'admin', created_at: '2026-11-20T10:00:00Z',
    actor: { display_name: 'Anna <:cat:7>' }, target: { display_name: 'Ben', username: 'ben' },
  }] }, isError: false, refetch: vi.fn() });
  render(<GroupRoleHistory chatId="5" rolesKey="d" />);
  const entry = screen.getByTestId('group-role-history');
  expect(entry.querySelector('[data-custom-emoji="7"]')).not.toBeNull();
  expect(entry).not.toHaveTextContent('<:cat:7>');
});
