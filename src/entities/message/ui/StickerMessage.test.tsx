import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StickerMessage } from './StickerMessage';

const dialog = vi.fn();
vi.mock('@/entities/sticker', () => ({
  StickerImage: ({ emoji, url }: { emoji: string; url: string }) => <img alt={emoji} src={url} />,
  openStickerPack: (pack: unknown) => dialog(pack),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { stickerLabel: 'Sticker {emoji}' } }) }));

it('opens the pack of a user sticker by its link and keeps the tap from reaching the message', () => {
  const onMessageClick = vi.fn();
  render(
    <div onClick={onMessageClick}>
      <StickerMessage sticker={{ id: '7', pack_id: '3', pack_slug: 'ABCDEFGHJKLM', emoji: '🐱', image_url: '/s/7' }} />
    </div>,
  );
  expect(screen.getByAltText('🐱')).toHaveAttribute('src', '/s/7');
  fireEvent.click(screen.getByRole('button', { name: 'Sticker 🐱' }));
  expect(dialog).toHaveBeenLastCalledWith({ slug: 'ABCDEFGHJKLM' });
  expect(onMessageClick).not.toHaveBeenCalled();
});

it('opens a built-in pack by its ID, and a quoted sticker without a pack is just a picture', () => {
  const { unmount } = render(<StickerMessage sticker={{ id: '7', pack_id: '3', emoji: '😀', image_url: '/s/7' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Sticker 😀' }));
  expect(dialog).toHaveBeenLastCalledWith({ packId: '3' });
  unmount();
  render(<StickerMessage sticker={{ emoji: '😀', image_url: '/s/7' }} />);
  expect(screen.queryByRole('button')).toBeNull();
});

afterEach(() => vi.useRealTimers());

it('leaves the tap after a long press to the message menu', () => {
  vi.useFakeTimers();
  dialog.mockClear();
  const onMessageClick = vi.fn();
  render(<div onClick={onMessageClick}><StickerMessage sticker={{ id: '7', pack_id: '3', emoji: '😀', image_url: '/s/7' }} /></div>);
  const button = screen.getByRole('button', { name: 'Sticker 😀' });
  fireEvent.touchStart(button);
  vi.advanceTimersByTime(600);
  fireEvent.click(button);
  expect(dialog).not.toHaveBeenCalled();
  expect(onMessageClick).toHaveBeenCalledTimes(1);
});
