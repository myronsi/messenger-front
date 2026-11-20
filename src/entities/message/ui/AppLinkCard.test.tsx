import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { AppLinkCard } from './AppLinkCard';

const emojiPack = vi.fn();
const install = vi.fn();
const openEmojiPackLink = vi.fn();
const parentClick = vi.fn();
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/ui/CustomEmoji', () => ({ CustomEmoji: ({ shortcode }: { shortcode: string }) => <span data-testid="emoji">{shortcode}</span> }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock('@/entities/emoji', () => ({
  useGetEmojiPackByLinkQuery: () => emojiPack(),
  useSetEmojiPackInstalledMutation: () => [install, { isLoading: false }],
  openEmojiPackLink: (slug: string) => openEmojiPackLink(slug),
}));
vi.mock('@/entities/sticker', () => ({
  useGetStickerPackQuery: () => ({ currentData: { id: '9', title: 'Office cats', is_mine: false, is_installed: true, stickers: [
    { id: 's1', emoji: '🐱', image: { url: '/a', panel_url: '/a' } },
  ] } }),
  useSetStickerPackInstalledMutation: () => [vi.fn(), { isLoading: false }],
  openStickerPack: vi.fn(),
  StickerImage: ({ emoji }: { emoji: string }) => <span>{emoji}</span>,
}));
vi.mock('@/entities/user', () => ({
  useGetUserByUsernameQuery: () => ({ data: { username: 'mailen', display_name: 'Mai', avatar_url: '/avatar' } }),
}));

const pack = (count: number, installed = false) => ({
  data: { id: '5', title: 'Maimai', is_mine: false, is_installed: installed, emoji: Array.from({ length: count }, (_, index) => ({ id: String(index), shortcode: `e${index}` })) },
});

describe('AppLinkCard', () => {
  beforeEach(() => { emojiPack.mockReset(); install.mockReset(); openEmojiPackLink.mockReset(); parentClick.mockReset(); });

  it('shows the plain link until the pack has loaded, then the card', () => {
    emojiPack.mockReturnValue({ data: undefined });
    const { rerender } = render(<AppLinkCard link={{ kind: 'emoji', slug: 'EBK' }} isMine={false} standalone fallback={<span>the link</span>} />);
    expect(screen.getByText('the link')).toBeInTheDocument();
    emojiPack.mockReturnValue(pack(12));
    rerender(<AppLinkCard link={{ kind: 'emoji', slug: 'EBK' }} isMine={false} standalone fallback={<span>the link</span>} />);
    expect(screen.queryByText('the link')).not.toBeInTheDocument();
    expect(screen.getByTestId('app-link-card')).toHaveClass('app-link-card-in');
    expect(screen.getByText('Emoji pack · 12 emoji')).toBeInTheDocument();
    expect(screen.getAllByTestId('emoji')).toHaveLength(8);
  });

  it('shows a cached pack at once without growing in again', () => {
    emojiPack.mockReturnValue(pack(3));
    render(<AppLinkCard link={{ kind: 'emoji', slug: 'EBK' }} isMine={false} />);
    expect(screen.getByTestId('app-link-card')).not.toHaveClass('app-link-card-in');
  });

  it('adds the pack with one tap without opening the message menu', () => {
    emojiPack.mockReturnValue(pack(3));
    render(<div onClick={parentClick}><AppLinkCard link={{ kind: 'emoji', slug: 'EBK' }} isMine={false} /></div>);
    fireEvent.click(screen.getByRole('button', { name: en.appLinks.add }));
    expect(install).toHaveBeenCalledWith({ packId: '5', installed: true });
    fireEvent.click(screen.getByRole('button', { name: 'Maimai' }));
    expect(openEmojiPackLink).toHaveBeenCalledWith('EBK');
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('says a sticker pack is already added and uses the singular for one sticker', () => {
    render(<AppLinkCard link={{ kind: 'sticker', slug: 'K3P' }} isMine />);
    expect(screen.getByText('Sticker pack · 1 sticker')).toBeInTheDocument();
    expect(screen.getByText(en.appLinks.added)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.appLinks.add })).not.toBeInTheDocument();
  });

  it('opens the chat from a profile card', () => {
    const navigated = vi.fn();
    window.addEventListener('popstate', navigated);
    render(<AppLinkCard link={{ kind: 'profile', username: 'mailen' }} isMine={false} />);
    expect(screen.getByText('@mailen')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.appLinks.message }));
    expect(window.location.pathname).toBe('/dm/@mailen');
    expect(navigated).toHaveBeenCalled();
    window.removeEventListener('popstate', navigated);
    window.history.pushState({}, '', '/');
  });
});
