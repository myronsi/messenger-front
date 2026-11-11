import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { closeStickerManager, openStickerPack } from '@/entities/sticker';
import { StickerManagerHost } from './StickerManagerHost';

vi.mock('@/entities/sticker', async (original) => ({
  ...await original<typeof import('@/entities/sticker')>(),
  StickerPackDialog: ({ pack, onClose }: { pack: { slug?: string }; onClose: () => void }) => (
    <button type="button" onClick={onClose}>{`pack ${pack.slug}`}</button>
  ),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));

afterEach(() => act(() => closeStickerManager()));

it('shows a requested pack preview once at the app root and closes it', () => {
  render(<StickerManagerHost />);
  expect(screen.queryByText('pack ABCD1234')).toBeNull();
  act(() => openStickerPack({ slug: 'ABCD1234' }));
  act(() => screen.getByText('pack ABCD1234').click());
  expect(screen.queryByText('pack ABCD1234')).toBeNull();
});
