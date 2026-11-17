import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ConnectionsSettingsPage from './ConnectionsSettingsPage';
import { toast } from '@/shared/ui/sonner';

const mocks = vi.hoisted(() => ({
  reorder: vi.fn(), remove: vi.fn(), start: vi.fn(), refetch: vi.fn(),
  items: [] as { id: string; provider: string; display_name: string; profile_url: string | null; verified_at: string }[],
}));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('./ConnectionVerifyDialog', () => ({
  default: ({ provider }: { provider: string | null }) => (provider ? <div data-testid="verify-dialog">{provider}</div> : null),
}));
vi.mock('@/features/connections', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/connections')>();
  const unwrap = (fn: (arg: unknown) => unknown) => (arg: unknown) => ({ unwrap: () => fn(arg) });
  return {
    ...actual,
    useGetMyConnectionsQuery: () => ({ data: mocks.items, isLoading: false, isError: false, refetch: mocks.refetch }),
    useGetConnectionProvidersQuery: () => ({ data: ['github', 'website'] }),
    useReorderConnectionsMutation: () => [unwrap(mocks.reorder), { isLoading: false }],
    useDeleteConnectionMutation: () => [unwrap(mocks.remove), { isLoading: false }],
    useStartConnectionMutation: () => [unwrap(mocks.start), { isLoading: false }],
  };
});

const connection = (id: string, provider: string, name: string) => ({
  id, provider, display_name: name, profile_url: `https://example.com/${id}`, verified_at: '2026-11-16T10:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.items = [connection('1', 'github', 'octo'), connection('2', 'website', 'example.org')];
  mocks.reorder.mockResolvedValue([]);
  mocks.remove.mockResolvedValue(undefined);
  mocks.start.mockResolvedValue('https://github.com/login/oauth/authorize?state=x');
  window.history.replaceState(null, '', '/settings/connections');
});
afterEach(cleanup);

const openMenu = (name: string) => fireEvent.pointerDown(screen.getByRole('button', { name: `Options for ${name}` }), { button: 0, ctrlKey: false });

it('lists accounts in order with their verification date and links to them from the menu', () => {
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  const rows = screen.getAllByTestId('connection-row');
  expect(rows.map((row) => within(row).getByText(/octo|example\.org/).textContent)).toEqual(['octo', 'example.org']);
  expect(within(rows[0]).getByText('GitHub · Verified 16 Nov')).toBeInTheDocument();
  openMenu('octo');
  expect(screen.getByRole('menuitem', { name: 'Open GitHub profile' })).toHaveAttribute('href', 'https://example.com/1');
  expect(screen.getByRole('menuitem', { name: 'Open GitHub profile' })).toHaveAttribute('rel', 'noopener noreferrer');
});

it('previews the accounts as they appear on the profile and counts them', () => {
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  const preview = screen.getByTestId('connections-preview');
  expect(within(preview).getAllByTestId('profile-connection').map((chip) => chip.textContent)).toEqual(['octo', 'example.org']);
  expect(screen.getByText('2/15')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /GitHub/ })).toHaveTextContent('Connected');
});

it('explains the preview when nothing is connected', () => {
  mocks.items = [];
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  expect(within(screen.getByTestId('connections-preview')).getByText(/show up here/)).toBeInTheDocument();
  expect(screen.getByText('0/15')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /GitHub/ })).not.toHaveTextContent('Connected');
});

it('moves an account and saves the new order', async () => {
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  openMenu('octo');
  expect(screen.getByRole('menuitem', { name: 'Move up' })).toHaveAttribute('data-disabled');
  fireEvent.click(screen.getByRole('menuitem', { name: 'Move down' }));
  await waitFor(() => expect(mocks.reorder).toHaveBeenCalledWith(['2', '1']));
});

it('reorders by dragging a row onto another', async () => {
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  const [first, second] = screen.getAllByTestId('connection-row');
  fireEvent.dragStart(second);
  fireEvent.drop(first);
  await waitFor(() => expect(mocks.reorder).toHaveBeenCalledWith(['2', '1']));
});

it('removes an account after confirming', async () => {
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  openMenu('octo');
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
  expect(screen.getByText('Remove octo from your profile?')).toBeInTheDocument();
  const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
  fireEvent.click(removeButtons[removeButtons.length - 1]);
  await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('1'));
  expect(toast).toHaveBeenCalledWith('Removed');
});

it('sends sign-in providers to the provider and opens the code dialog for the others', async () => {
  const navigate = vi.fn();
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} navigate={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: /GitHub/ }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://github.com/login/oauth/authorize?state=x'));
  fireEvent.click(screen.getByRole('button', { name: /Website/ }));
  expect(screen.getByTestId('verify-dialog')).toHaveTextContent('website');
  expect(mocks.start).toHaveBeenCalledTimes(1);
});

it('shows the result of a provider sign-in once and cleans the address', () => {
  window.history.replaceState(null, '', '/settings/connections?provider=github&result=connected');
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  expect(toast.success).toHaveBeenCalledWith('GitHub is now connected.');
  expect(mocks.refetch).toHaveBeenCalled();
  expect(window.location.search).toBe('');
  window.history.replaceState(null, '', '/settings/connections?provider=steam&result=denied');
  cleanup();
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  expect(toast.error).toHaveBeenCalledWith('Connecting Steam was cancelled.');
});

it('stops offering new accounts at the limit', () => {
  mocks.items = Array.from({ length: 15 }, (_, i) => connection(String(i), 'website', `site${i}.example`));
  render(<ConnectionsSettingsPage isActive onBack={vi.fn()} />);
  expect(screen.getByText('You can connect up to 15 accounts.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /GitHub/ })).toBeDisabled();
});
