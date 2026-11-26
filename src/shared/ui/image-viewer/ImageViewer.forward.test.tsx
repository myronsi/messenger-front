import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImageViewer from './ImageViewer';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', translations: { forward: 'Forward', makeSticker: 'Make sticker', drawOnImage: 'Draw', mediaOptions: 'More options', close: 'Close' } }),
}));
vi.mock('@/shared/api/fetchMedia', () => ({ fetchMedia: vi.fn(async () => new Response('png', { status: 200 })) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }));

describe('ImageViewer actions', () => {
  it('forwards the shown media and hides the button when it cannot be forwarded', () => {
    const onForward = vi.fn();
    const { rerender } = render(<ImageViewer images={[{ url: '/a.png', name: 'a.png', onForward }]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(onForward).toHaveBeenCalledOnce();
    rerender(<ImageViewer images={[{ url: '/a.png', name: 'a.png' }]} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Forward' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('viewer-options')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).not.toHaveClass('max-sm:hidden');
  });

  it('puts the actions behind a phone-only options button that replaces close', () => {
    const onMakeSticker = vi.fn();
    render(<ImageViewer images={[{ url: '/a.png', name: 'a.png', onForward: vi.fn(), onMakeSticker }]} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('max-sm:hidden');
    expect(screen.getByRole('button', { name: 'Forward' })).toHaveClass('max-sm:hidden');
    const options = screen.getByTestId('viewer-options');
    expect(options).toHaveClass('sm:hidden');
    fireEvent.keyDown(options, { key: 'Enter' });
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Forward', 'Make sticker']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Make sticker' }));
    expect(onMakeSticker).toHaveBeenCalledOnce();
  });
});
