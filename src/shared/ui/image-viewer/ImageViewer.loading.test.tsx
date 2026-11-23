import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImageViewer from './ImageViewer';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: {} }) }));
vi.mock('@/shared/api/fetchMedia', () => ({ fetchMedia: vi.fn(async () => new Response('png', { status: 200 })) }));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});

describe('ImageViewer loading', () => {
  it('swaps the thumbnail for the full image without a fade and keeps the drawing from the first frame', () => {
    const drawing = { version: 1, items: [{ type: 'stroke' as const, color: '#ff0000', width: 0.01, points: [0.1, 0.2, 0.3, 0.4] }] };
    render(<ImageViewer images={[{ url: '/photo.png', name: 'photo.png', previewUrl: '/thumb.png', drawing, aspect: 2 }]} onClose={vi.fn()} />);
    expect(screen.getByTestId('drawing-overlay')).toBeInTheDocument();
    const image = screen.getByAltText('photo.png');
    expect(image.style.transition).not.toContain('opacity');
    fireEvent.load(image);
    expect(screen.getByTestId('drawing-overlay')).toBeInTheDocument();
  });

  it('fades in an image that has no thumbnail', () => {
    render(<ImageViewer images={[{ url: '/photo.png', name: 'photo.png' }]} onClose={vi.fn()} />);
    expect(screen.getByAltText('photo.png').style.transition).toContain('opacity 0.15s');
  });
});
