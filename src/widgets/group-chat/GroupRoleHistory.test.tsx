import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import GroupRoleHistory from './GroupRoleHistory';

const query = vi.fn();
vi.mock('@/entities/chat', () => ({ useGetGroupRoleLogQuery: (...args: unknown[]) => query(...args) }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', translations: {
    roleHistory: 'Role history', roleHistoryEmpty: 'No role changes yet', roleHistoryError: "Couldn't load the role history", loading: 'Loading...',
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
