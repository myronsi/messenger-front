import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImageMessage from './ImageMessage';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {}, language: 'en' }) }));
vi.mock('@/shared/lib/thumbhash', () => ({ placeholderDataURL: (value?: string | null) => (value ? 'data:image/png;base64,AAAA' : undefined) }));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});

const drawing = { version: 1, items: [{ type: 'stroke' as const, color: '#ff0000', width: 0.01, points: [0, 0, 1, 1] }] };

describe('ImageMessage', () => {
  it('fits the drawing to the real image shape when only a thumbnail was loaded', () => {
    render(<ImageMessage fileUrl="/wide.png" thumbnailUrl="/wide-thumb.png" fileName="wide.png" isMine={false} drawing={drawing} />);
    const image = screen.getByAltText('wide.png');
    Object.defineProperty(image, 'naturalWidth', { value: 320 });
    Object.defineProperty(image, 'naturalHeight', { value: 180 });
    fireEvent.load(image);
    expect(screen.getByTestId('drawing-overlay').getAttribute('viewBox')).toBe('0 0 1000 562.5');
  });


  it('reports a broken image only after both the preview and the full image fail', () => {
    const onBroken = vi.fn();
    render(<ImageMessage fileUrl="/fff.png" thumbnailUrl="/fff-thumb.png" fileName="fff.png" isMine={false} onBroken={onBroken} />);
    fireEvent.error(screen.getByAltText('fff.png'));
    expect(onBroken).not.toHaveBeenCalled();
    expect(screen.getByAltText('fff.png')).toHaveAttribute('src', '/fff.png');
    fireEvent.error(screen.getByAltText('fff.png'));
    expect(onBroken).toHaveBeenCalledOnce();
  });

  it('shows a photo that is already in memory at once, without fading it in again', () => {
    const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(480);
    render(<ImageMessage fileUrl="/seen.png" thumbnailUrl="/seen-thumb.png" fileName="seen.png" isMine={false} />);
    const image = screen.getByAltText('seen.png');
    expect(image.className).toContain('opacity-100');
    expect(image.className).not.toContain('transition-opacity');
    naturalWidth.mockRestore();
  });

  it('fades in a photo that still has to load', () => {
    render(<ImageMessage fileUrl="/new.png" thumbnailUrl="/new-thumb.png" fileName="new.png" isMine={false} />);
    const image = screen.getByAltText('new.png');
    expect(image.className).toContain('opacity-0');
    expect(image.className).toContain('transition-opacity');
    fireEvent.load(image);
    expect(image.className).toContain('opacity-100');
  });

  it('keeps the blurred placeholder behind the photo until the photo has faded in', () => {
    render(<ImageMessage fileUrl="/slow.png" thumbnailUrl="/slow-thumb.png" fileName="slow.png" isMine={false} placeholder="ZAYKNZpwd4dwiHeIiHh4h3CACPd3" />);
    const image = screen.getByAltText('slow.png');
    const frame = image.parentElement as HTMLElement;
    expect(frame.style.backgroundImage).toContain('url(');
    fireEvent.load(image);
    expect(frame.style.backgroundImage).toContain('url(');
    fireEvent(image, Object.assign(new Event('transitionend', { bubbles: true }), { propertyName: 'opacity' }));
    expect(frame.style.backgroundImage).toBe('');
  });
});
