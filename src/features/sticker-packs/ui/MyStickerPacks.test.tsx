import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { MyStickerPacks } from './MyStickerPacks';

const list = vi.fn();
const create = vi.fn();
vi.mock('@/entities/sticker', () => ({
  useListOwnStickerPacksQuery: () => list(),
  useCreateStickerPackMutation: () => [create, { isLoading: false }],
  StickerImage: ({ emoji }: { emoji: string }) => <span>{emoji}</span>,
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en }) }));

beforeEach(() => {
  list.mockReset();
  create.mockReset();
});

it('creates a pack and opens it', async () => {
  list.mockReturnValue({ currentData: [] });
  create.mockReturnValue({ unwrap: () => Promise.resolve({ id: '9' }) });
  const onOpen = vi.fn();
  render(<MyStickerPacks onOpen={onOpen} />);
  expect(screen.getByText(en.noOwnStickerPacks)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(en.stickerPackTitle), { target: { value: '  Cats ' } });
  fireEvent.click(screen.getByRole('button', { name: en.createStickerPack }));
  await waitFor(() => expect(onOpen).toHaveBeenCalledWith('9'));
  expect(create).toHaveBeenCalledWith('Cats');
});

it('says when the pack limit is reached', async () => {
  list.mockReturnValue({ currentData: [{ id: '1', title: 'Dogs', stickers: [] }] });
  create.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
  render(<MyStickerPacks onOpen={vi.fn()} />);
  expect(screen.getByText('Dogs')).toBeInTheDocument();
  expect(screen.queryByLabelText(en.stickerPackTitle)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: en.newStickerPack }));
  fireEvent.change(screen.getByLabelText(en.stickerPackTitle), { target: { value: 'More' } });
  fireEvent.click(screen.getByRole('button', { name: en.createStickerPack }));
  expect(await screen.findByRole('alert')).toHaveTextContent(en.stickerPackLimit);
});
