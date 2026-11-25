import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { StickerMaker } from './StickerMaker';

const addSticker = vi.fn();
const uploadClip = vi.fn();
const clip = { kind: 'video' as const, startMs: 1000, endMs: 4000, crop: { x: 0.2, y: 0, size: 1 } };
vi.mock('@/entities/sticker', () => ({
  useListOwnStickerPacksQuery: () => ({ currentData: [] }),
  StickerImage: () => null,
  useCreateStickerPackMutation: () => [vi.fn()],
  useAddStickerMutation: () => [addSticker],
  uploadStickerImage: vi.fn(),
  uploadStickerClip: (...args: unknown[]) => uploadClip(...args),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en }) }));
vi.mock('../model/useStickerSource', () => ({ useStickerSource: () => ({ url: 'blob:clip', failed: false, type: 'video/mp4' }) }));
vi.mock('./VideoStickerEditor', () => ({
  VideoStickerEditor: ({ onDone }: { onDone: (value: typeof clip) => void }) => <button type="button" onClick={() => onDone(clip)}>trim</button>,
}));
vi.mock('@/shared/ui/drawing', () => ({ DrawingEditor: () => null, flattenDrawing: vi.fn() }));

const video = new Blob(['clip'], { type: 'video/mp4' });

beforeEach(() => {
  addSticker.mockReset();
  uploadClip.mockReset();
  vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => video })));
});
afterEach(() => vi.unstubAllGlobals());

it('uploads the kept part of a video without drawing tools', async () => {
  addSticker.mockReturnValue({ unwrap: () => Promise.resolve({ id: '1' }) });
  uploadClip.mockResolvedValue({ id: 'clip' });
  const onClose = vi.fn();
  render(<StickerMaker sourceUrl="blob:clip" sourceType="video/mp4" packId="3" onClose={onClose} />);
  expect(screen.getByText(en.videoStickers.title)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'trim' }));
  expect(screen.queryByRole('button', { name: en.stickerDraw })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('option', { name: '😀' }));
  fireEvent.click(screen.getByRole('button', { name: en.addStickerToPack }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(uploadClip).toHaveBeenCalledWith(expect.any(Blob), { ...clip, fileName: 'sticker.mp4' });
  expect(addSticker).toHaveBeenCalledWith({ packId: '3', attachmentId: 'clip', emoji: '😀' });
});

it('says a clip is too large in words about clips', async () => {
  uploadClip.mockRejectedValue({ status: 413 });
  render(<StickerMaker sourceUrl="blob:clip" sourceType="video/mp4" packId="3" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'trim' }));
  fireEvent.click(screen.getByRole('option', { name: '😀' }));
  fireEvent.click(screen.getByRole('button', { name: en.addStickerToPack }));
  expect(await screen.findByRole('alert')).toHaveTextContent(en.videoStickers.tooLarge);
});
