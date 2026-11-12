import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmojiStickerPanel } from './EmojiStickerPanel';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: new Proxy({}, { get: (_target, key) => String(key) }), language: 'en' }),
}));
vi.mock('./StickerTab', () => ({ StickerTab: () => null }));

describe('EmojiStickerPanel search', () => {
  it('shows only a magnifier until it is pressed, then a focused field that closes and clears', () => {
    render(<EmojiStickerPanel onEmoji={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'searchEmojiAndStickers' }));
    const field = screen.getByRole('searchbox', { name: 'searchEmojiAndStickers' });
    expect(field).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'searchEmojiAndStickers' })).not.toBeInTheDocument();

    fireEvent.change(field, { target: { value: 'zzzz-no-match' } });
    fireEvent.click(screen.getByRole('button', { name: 'closeSearch' }));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'searchEmojiAndStickers' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});
