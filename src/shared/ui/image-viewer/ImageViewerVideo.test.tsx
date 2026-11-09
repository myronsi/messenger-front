import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImageViewer from './ImageViewer';
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: {
  previousImage: 'Previous image', nextImage: 'Next image', videoRewind: 'Back {count} seconds', videoForward: 'Forward {count} seconds', videoSeconds: '{count} s',
} }) }));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});
describe('ImageViewer with videos', () => {
  it('plays a video inside the same gallery and toggles it with Space', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    render(<ImageViewer initialIndex={1} onClose={vi.fn()} images={[
      { url: '/a.png', name: 'a.png' },
      { url: 'https://example.test/clip.mp4', name: 'clip.mp4', isVideo: true, previewUrl: '/clip-thumb.jpg' },
    ]} />);
    const video = screen.getByLabelText('clip.mp4', { selector: 'video' }) as HTMLVideoElement;
    expect(screen.getByTestId('image-viewer-preview')).toHaveAttribute('src', '/clip-thumb.jpg');
    expect(screen.getByTestId('viewer-video-controls')).toBeInTheDocument();
    play.mockClear();
    fireEvent.keyDown(window, { key: ' ' });
    expect(play).toHaveBeenCalledTimes(1);
    Object.defineProperty(video, 'paused', { configurable: true, value: false });
    fireEvent.keyDown(window, { key: ' ' });
    expect(pause).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.queryByTestId('viewer-video-controls')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'a.png');
    play.mockRestore();
    pause.mockRestore();
  });
});
