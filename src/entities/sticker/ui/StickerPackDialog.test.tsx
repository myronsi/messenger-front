import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { StickerPackDialog } from './StickerPackDialog';

const { mobile } = vi.hoisted(() => ({ mobile: { value: true } }));

vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => mobile.value }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en }) }));
vi.mock('./StickerPackReport', () => ({ StickerPackReport: () => null }));
vi.mock('./StickerImage', () => ({ StickerImage: () => null }));
vi.mock('../api/stickerApi', () => ({
  useGetStickerPackQuery: () => ({ currentData: { id: '1', title: 'Cats', slug: 'ABC', stickers: [], is_installed: false }, isError: false, isFetching: false }),
  useSetStickerPackInstalledMutation: () => [vi.fn(), { isLoading: false, isError: false }],
}));

it('opens as a bottom sheet on phones', () => {
  mobile.value = true;
  render(<StickerPackDialog pack={{ slug: 'ABC' }} onClose={vi.fn()} />);
  expect(screen.getByTestId('sticker-pack-sheet')).toHaveTextContent('Cats');
});

it('stays a dialog on larger screens', () => {
  mobile.value = false;
  render(<StickerPackDialog pack={{ slug: 'ABC' }} onClose={vi.fn()} />);
  expect(screen.queryByTestId('sticker-pack-sheet')).not.toBeInTheDocument();
  expect(screen.getByRole('dialog')).toHaveTextContent('Cats');
});

it('keeps the window on screen for its closing animation and reports the close once it is over', () => {
  vi.useFakeTimers();
  mobile.value = false;
  const onClose = vi.fn();
  render(<StickerPackDialog pack={{ slug: 'ABC' }} onClose={onClose} />);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(700); });
  expect(onClose).toHaveBeenCalledOnce();
  vi.useRealTimers();
});
