import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { StickerPackEditor } from './StickerPackEditor';

const { reorder, pack, mutation } = vi.hoisted(() => {
  const sticker = (id: string, emoji: string) => ({ id, emoji, image: { url: `/s/${id}` } });
  return {
    reorder: vi.fn(() => ({ unwrap: () => new Promise(() => undefined) })),
    pack: { id: '1', title: 'Cats', slug: 'ABC', stickers: [sticker('a', '😀'), sticker('b', '😂'), sticker('c', '😍')] },
    mutation: () => [vi.fn(), { isLoading: false }],
  };
});

vi.mock('@/entities/sticker', () => ({
  useGetStickerPackQuery: () => ({ currentData: pack }),
  useRenameStickerPackMutation: () => [vi.fn()],
  useDeleteStickerPackMutation: mutation,
  useDeleteStickerMutation: mutation,
  useReorderStickersMutation: () => [reorder, { isLoading: false }],
  useSetStickerEmojiMutation: mutation,
  StickerImage: ({ emoji }: { emoji: string }) => <span>{emoji}</span>,
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en }) }));
vi.mock('./StickerMaker', () => ({ StickerMaker: () => null }));

const tiles = () => within(screen.getByRole('list', { name: 'Cats' })).getAllByRole('button', { pressed: false }).map((tile) => tile.getAttribute('aria-label'));
const label = (emoji: string) => en.stickerLabel.replace('{emoji}', emoji);

it('shows the new place while dragging and saves the order on drop', () => {
  render(<StickerPackEditor packId="1" onBack={vi.fn()} />);
  const items = within(screen.getByRole('list', { name: 'Cats' })).getAllByRole('listitem').slice(1);
  const dataTransfer = { effectAllowed: '' };
  fireEvent.dragStart(items[0], { dataTransfer });
  fireEvent.dragEnter(items[2], { dataTransfer });
  expect(tiles()).toEqual([label('😂'), label('😍'), label('😀')]);
  expect(reorder).not.toHaveBeenCalled();
  const target = within(screen.getByRole('list', { name: 'Cats' })).getAllByRole('listitem')[3];
  fireEvent.drop(target, { dataTransfer });
  expect(reorder).toHaveBeenCalledWith({ packId: '1', stickerIds: ['b', 'c', 'a'] });
  expect(tiles()).toEqual([label('😂'), label('😍'), label('😀')]);
});

it('asks in a separate dialog before deleting the pack', () => {
  render(<StickerPackEditor packId="1" onBack={vi.fn()} />);
  fireEvent.pointerDown(screen.getByRole('button', { name: en.stickerPackActions }), { button: 0, ctrlKey: false });
  fireEvent.click(screen.getByRole('menuitem', { name: en.deleteStickerPack }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent(en.deleteStickerPackConfirm.replace('{title}', 'Cats'));
});
