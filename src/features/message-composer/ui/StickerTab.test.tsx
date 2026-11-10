import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Sticker, StickerPack } from '@/entities/sticker';
import { StickerTab } from './StickerTab';

const packs = vi.fn();
const recent = vi.fn();
vi.mock('@/entities/sticker', () => ({
  useListStickerPacksQuery: () => packs(),
  useListRecentStickersQuery: () => recent(),
  StickerImage: ({ emoji }: { emoji: string }) => <span>{emoji}</span>,
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: {
    stickerLabel: 'Sticker {emoji}', recentStickers: 'Recent', noStickerPacks: 'No packs', stickersUnavailable: 'Failed',
    stickersRetry: 'Try again', loading: 'Loading...',
  } }),
}));

const sticker = (id: string, emoji: string) => ({ id, pack_id: '3', emoji, is_animated: false, image: { url: `/s/${id}` } }) as Sticker;
const pack = {
  id: '3', title: 'Cats', is_official: true, is_installed: true, is_mine: false, is_hidden: false, stickers: [sticker('1', '🐱'), sticker('2', '😺')],
} as StickerPack;

beforeEach(() => {
  packs.mockReset();
  recent.mockReset();
  recent.mockReturnValue({ currentData: [] });
});

it('lists recent stickers before the packs and sends the one picked', () => {
  packs.mockReturnValue({ currentData: [pack] });
  recent.mockReturnValue({ currentData: [sticker('2', '😺')] });
  const onPick = vi.fn();
  render(<StickerTab onPick={onPick} />);
  expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['Recent', 'Cats']);
  fireEvent.click(screen.getByRole('button', { name: 'Sticker 🐱' }));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
});

it('leaves out packs that have no stickers yet', () => {
  packs.mockReturnValue({ currentData: [pack, { ...pack, id: '4', title: 'Empty', stickers: [] }] });
  render(<StickerTab onPick={vi.fn()} />);
  expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['Cats']);
});

it('says when there are no packs, and offers a retry when loading failed', () => {
  packs.mockReturnValue({ currentData: [] });
  const { unmount } = render(<StickerTab onPick={vi.fn()} />);
  expect(screen.getByText('No packs')).toBeInTheDocument();
  unmount();
  const refetch = vi.fn();
  packs.mockReturnValue({ currentData: undefined, isError: true, isFetching: false, refetch });
  render(<StickerTab onPick={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(refetch).toHaveBeenCalled();
});
