import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImageMessage from './ImageMessage';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {}, language: 'en' }) }));
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
});
