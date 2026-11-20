import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '@/shared/lib/copyText';
import { InviteLinksPanel } from './InviteLinksPanel';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: vi.fn() }));
vi.mock('@/shared/lib/copyText', () => ({ copyText: vi.fn(async () => true) }));
vi.mock('@/shared/lib/webOrigin', () => ({ publicWebOrigin: () => 'https://chat.example' }));
const api = vi.hoisted(() => ({ links: [] as unknown[], create: vi.fn(), revoke: vi.fn() }));
vi.mock('@/entities/group', () => ({
  useGetInviteLinksQuery: () => ({ data: api.links, isLoading: false, isError: false, refetch: vi.fn() }),
  useCreateInviteLinkMutation: () => [api.create, { isLoading: false }],
  useRevokeInviteLinkMutation: () => [api.revoke],
}));

const token = `${'Ab3'.repeat(7)}x`;
const link = (overrides: Record<string, unknown> = {}) => ({
  id: '1', token, name: 'Team', created_by: '2', created_at: '2026-11-20T10:00:00Z', expires_at: null, max_uses: null, use_count: 2,
  revoked_at: null, is_active: true, ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  api.links = [];
});

describe('InviteLinksPanel', () => {
  it('creates a link that never expires and has no limit by default, and copies it', async () => {
    api.create.mockReturnValue({ unwrap: () => Promise.resolve(link()) });
    render(<InviteLinksPanel chatId="5" groupName="Hikers" />);
    expect(screen.getByText('No invite links yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    expect(screen.getByRole('radio', { name: 'Never' })).toBeChecked();
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: ' Team ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ chatId: '5', name: 'Team', expiresAt: null, maxUses: null }));
    expect(copyText).toHaveBeenCalledWith(`https://chat.example/join/${token}`);
  });

  it('sends the chosen expiry and use limit and refuses a bad limit', async () => {
    api.create.mockReturnValue({ unwrap: () => Promise.resolve(link()) });
    render(<InviteLinksPanel chatId="5" groupName="Hikers" />);
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    fireEvent.click(screen.getByRole('radio', { name: '1 day' }));
    fireEvent.change(screen.getByLabelText('Use limit'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Create link' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Use limit'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    const args = api.create.mock.calls[0][0];
    expect(args.maxUses).toBe(10);
    expect(Date.parse(args.expiresAt) - Date.now()).toBeGreaterThan(23 * 3600 * 1000);
  });

  it('shows the limit of 50 links', async () => {
    api.create.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { code: 'limit_reached' } }) });
    render(<InviteLinksPanel chatId="5" groupName="Hikers" />);
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This group already has 50 active links. Revoke one first.');
  });

  it('lists links with their uses and state and revokes after confirming', async () => {
    api.links = [
      link(),
      link({ id: '2', name: null, max_uses: 5, use_count: 5, is_active: false }),
      link({ id: '3', name: 'Old', revoked_at: '2026-11-19T00:00:00Z', is_active: false }),
    ];
    api.revoke.mockReturnValue({ unwrap: () => Promise.resolve() });
    render(<InviteLinksPanel chatId="5" groupName="Hikers" />);
    const rows = screen.getAllByTestId('invite-link');
    expect(rows.map((row) => row.getAttribute('data-state'))).toEqual(['active', 'used_up', 'revoked']);
    expect(rows[0]).toHaveTextContent('2 joins · Never expires');
    expect(rows[1]).toHaveTextContent('Used up · 5 of 5 joins');
    expect(within(rows[2]).queryByRole('button')).toBeNull();
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Revoke' }));
    const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
    fireEvent.click(revokeButtons[revokeButtons.length - 1]);
    await waitFor(() => expect(api.revoke).toHaveBeenCalledWith({ chatId: '5', linkId: '1' }));
  });
});
