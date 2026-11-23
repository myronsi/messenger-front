import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '@/shared/contexts/AppearanceProvider';
import { PublicLinkPage } from './PublicLinkPage';
import { loadPublicInvite, loadPublicName } from './publicLinkApi';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations, setLanguage: () => {} }) };
});
vi.mock('./publicLinkApi', () => ({ loadPublicName: vi.fn(), loadPublicInvite: vi.fn() }));

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname} {(location.state as { returnPath?: string } | null)?.returnPath ?? ''}</p>;
};

const token = `${'Ab3'.repeat(7)}x`;
const renderAt = (target: Parameters<typeof PublicLinkPage>[0]['target']) => render(
  <AppearanceProvider><MemoryRouter><PublicLinkPage target={target} /><Where /></MemoryRouter></AppearanceProvider>,
);

beforeEach(() => vi.clearAllMocks());

describe('PublicLinkPage', () => {
  it('shows the public card of a user and keeps the link through sign-up', async () => {
    vi.mocked(loadPublicName).mockResolvedValue({ kind: 'user', user: { username: 'anna_k', display_name: 'Anna K', avatar_url: null, bio: 'Hello there' } });
    renderAt({ kind: 'name', name: 'anna_k' });
    expect(await screen.findByRole('heading', { name: 'Anna K' })).toBeInTheDocument();
    expect(screen.getByText('@anna_k')).toBeInTheDocument();
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(loadPublicName).toHaveBeenCalledWith('anna_k', expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/register /@anna_k');
  });

  it('sends people with an account to sign-in with the link kept', async () => {
    vi.mocked(loadPublicName).mockResolvedValue({ kind: 'user', user: { username: 'anna_k', display_name: 'Anna K', avatar_url: null, bio: null } });
    renderAt({ kind: 'name', name: 'anna_k' });
    fireEvent.click(await screen.findByRole('button', { name: 'Open in Messenger' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/login /@anna_k');
  });

  it('shows a public group with its member count', async () => {
    vi.mocked(loadPublicName).mockResolvedValue({
      kind: 'group', group: { name: 'Hikers', public_name: 'hikers', description: 'Weekend trips', avatar_url: null, member_count: 12 },
    });
    renderAt({ kind: 'name', name: 'hikers' });
    expect(await screen.findByRole('heading', { name: 'Hikers' })).toBeInTheDocument();
    expect(screen.getByText('12 members')).toBeInTheDocument();
    expect(screen.getByText('Sign up or sign in to join this group.')).toBeInTheDocument();
  });

  it('gives private and unknown names the same answer', async () => {
    vi.mocked(loadPublicName).mockResolvedValue({ kind: 'unavailable' });
    renderAt({ kind: 'name', name: 'ghost' });
    expect(await screen.findByRole('heading', { name: 'This account is not available' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('explains a broken invite link', async () => {
    vi.mocked(loadPublicInvite).mockResolvedValue({ kind: 'unavailable' });
    renderAt({ kind: 'invite', token });
    expect(await screen.findByRole('heading', { name: 'This invite link does not work' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByTestId('where')).toHaveTextContent(`/register /join/${token}`);
  });

  it('asks to wait when rate limited and loads again on retry', async () => {
    vi.mocked(loadPublicInvite).mockResolvedValueOnce({ kind: 'limited' }).mockResolvedValueOnce({
      kind: 'group', group: { name: 'Hikers', public_name: null, description: null, avatar_url: null, member_count: 1 },
    });
    renderAt({ kind: 'invite', token });
    expect(await screen.findByText('Too many requests. Try again in a minute.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('1 member')).toBeInTheDocument();
  });
});
