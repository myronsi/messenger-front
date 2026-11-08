import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GroupRoleHistoryPage from './GroupRoleHistoryPage';
import GroupRoleHistoryRow from './GroupRoleHistoryRow';

const query = vi.hoisted(() => vi.fn());
vi.mock('@/entities/chat', () => ({ useGetGroupRoleLogQuery: (...args: unknown[]) => query(...args) }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', translations: {
    roleHistory: 'Role history', roleHistoryEmpty: 'No role changes yet', roleHistoryError: "Couldn't load the role history", loading: 'Loading...',
    roleHistoryCount: '{count} changes', groupProfile: 'Group profile', back: 'Back', roleMadeAdmin: '{actor} made {target} an admin', systemSomeone: 'Someone',
  } }),
}));

const event = {
  id: '1', role: 'admin', created_at: '2026-11-07T10:00:00Z',
  actor: { id: '1', username: 'alice', display_name: 'Alice' }, target: { id: '2', username: 'bob', display_name: 'Bob' },
};

describe('group role history page', () => {
  it('opens from a row that counts the changes', () => {
    query.mockReturnValue({ currentData: { items: [event, { ...event, id: '2' }] }, isError: false, refetch: vi.fn() });
    const open = vi.fn();
    render(<GroupRoleHistoryRow chatId="5" onOpen={open} />);
    fireEvent.click(screen.getByRole('button', { name: /Role history/ }));
    expect(screen.getByText('2 changes')).toBeInTheDocument();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('lists the changes on its own page and goes back with the button, the breadcrumb or Escape', () => {
    query.mockReturnValue({ currentData: { items: [event] }, isError: false, refetch: vi.fn() });
    const back = vi.fn();
    render(<GroupRoleHistoryPage chatId="5" rolesKey="a" onBack={back} />);
    const page = screen.getByRole('region', { name: 'Role history' });
    expect(screen.getByRole('list', { name: 'Role history' })).toHaveTextContent('Alice made Bob an admin');
    expect(screen.getByRole('button', { name: 'Back' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Group profile' }));
    fireEvent.keyDown(page, { key: 'Escape' });
    expect(back).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});

describe('group role history page motion', () => {
  it('slides in from the right edge with the shared window motion and slides out while closing', async () => {
    query.mockReturnValue({ currentData: { items: [] }, isError: false, refetch: vi.fn() });
    const view = render(<GroupRoleHistoryPage chatId="5" rolesKey="a" onBack={vi.fn()} />);
    const page = screen.getByRole('region', { name: 'Role history' });
    expect(page).toHaveClass('motion-window-slide', 'translate-x-full');
    await waitFor(() => expect(page).toHaveClass('translate-x-0'));
    view.rerender(<GroupRoleHistoryPage chatId="5" rolesKey="a" onBack={vi.fn()} closing />);
    expect(page).toHaveClass('motion-window-slide', 'translate-x-full');
    expect(page).toHaveAttribute('data-closing', 'true');
  });
});
