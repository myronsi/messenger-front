import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImageMessage from './ImageMessage';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {}, language: 'en' }) }));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});

describe('ImageMessage', () => {
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
