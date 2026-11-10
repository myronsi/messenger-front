import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { StickerMaker } from './StickerMaker';

const createPack = vi.fn();
const addSticker = vi.fn();
const upload = vi.fn();
vi.mock('@/entities/sticker', () => ({
  useListOwnStickerPacksQuery: () => ({ currentData: [] }),
  useCreateStickerPackMutation: () => [createPack],
  useAddStickerMutation: () => [addSticker],
  uploadStickerImage: (...args: unknown[]) => upload(...args),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en }) }));
vi.mock('../model/useStickerSource', () => ({ useStickerSource: () => ({ url: 'blob:photo', failed: false }) }));
vi.mock('./StickerCropper', () => ({
  StickerCropper: ({ onDone }: { onDone: (image: Blob) => void }) => <button type="button" onClick={() => onDone(new Blob(['x']))}>crop</button>,
}));
vi.mock('@/shared/ui/drawing', () => ({ DrawingEditor: () => null, flattenDrawing: vi.fn() }));

it('reuses the pack it created when saving again after a failed upload', async () => {
  createPack.mockReturnValue({ unwrap: () => Promise.resolve({ id: '9' }) });
  addSticker.mockReturnValue({ unwrap: () => Promise.resolve({ id: '1' }) });
  upload.mockRejectedValueOnce({ status: 413 }).mockResolvedValueOnce({ id: 'img' });
  const onClose = vi.fn();
  render(<StickerMaker sourceUrl="blob:photo" onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'crop' }));
  fireEvent.click(screen.getByRole('option', { name: '😀' }));
  fireEvent.change(screen.getByLabelText(en.stickerPackTitle), { target: { value: 'Cats' } });
  fireEvent.click(screen.getByRole('button', { name: en.saveSticker }));
  expect(await screen.findByRole('alert')).toHaveTextContent(en.stickerImageTooLarge);
  fireEvent.click(screen.getByRole('button', { name: en.saveSticker }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(createPack).toHaveBeenCalledTimes(1);
  expect(addSticker).toHaveBeenCalledWith({ packId: '9', attachmentId: 'img', emoji: '😀' });
});
