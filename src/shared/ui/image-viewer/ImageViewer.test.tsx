import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMedia } from '@/shared/api/fetchMedia';
import ImageViewer from './ImageViewer';
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { previousImage: 'Previous image', nextImage: 'Next image' } }) }));
vi.mock('@/shared/api/fetchMedia', () => ({ fetchMedia: vi.fn(async () => new Response('png', { status: 200 })) }));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});
const renderViewer = () => {
  const parent = { onContextMenu: vi.fn(), onClick: vi.fn(), onPointerDown: vi.fn() };
  const onClose = vi.fn();
  render(
    <div {...parent}>
      <ImageViewer images={[{ url: '/photo.png', name: 'photo.png' }]} onClose={onClose} />
    </div>,
  );
  return { parent, onClose, stage: screen.getByTestId('image-viewer-stage'), image: screen.getByAltText('photo.png') };
};
describe('ImageViewer', () => {
  it('does not turn the remaining finger of a pinch into a dismiss swipe', () => {
    const { stage, image, onClose } = renderViewer();
    const point = (pointerId: number, clientX: number, clientY: number) => ({ pointerId, clientX, clientY, pointerType: 'touch' });
    fireEvent.pointerDown(stage, point(1, 100, 100));
    fireEvent.pointerDown(stage, point(2, 300, 100));
    fireEvent.pointerMove(stage, point(2, 500, 100));
    fireEvent.pointerMove(stage, point(2, 200, 100));
    fireEvent.pointerUp(stage, point(2, 200, 100));
    fireEvent.pointerMove(stage, point(1, 100, 280));
    expect(image.style.transform).toContain('translate(0px, 0px)');
    expect(screen.getByRole('dialog').style.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(image.style.clipPath).toBe('');
    fireEvent.pointerUp(stage, point(1, 100, 280));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(stage, { clientX: 100, clientY: 280 });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(stage, point(3, 100, 100));
    fireEvent.pointerMove(stage, point(3, 100, 260));
    fireEvent.pointerUp(stage, point(3, 100, 260));
    expect(onClose).toHaveBeenCalledOnce();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('switches photos with mobile edge taps, stays at gallery boundaries, and ignores taps while zoomed', () => {
    vi.stubGlobal('innerWidth', 390);
    const onClose = vi.fn();
    render(<ImageViewer images={[{ url: '/a.png', name: 'A' }, { url: '/b.png', name: 'B' }]} onClose={onClose} />);
    const stage = screen.getByTestId('image-viewer-stage');
    expect(screen.getByRole('button', { name: 'Next image' })).toHaveClass('max-sm:opacity-0', 'max-sm:pointer-events-none', 'max-sm:focus-visible:opacity-100');
    expect(screen.getByTestId('mobile-gallery-edges')).toHaveClass('pointer-events-none', 'sm:hidden');
    fireEvent.click(stage, { clientX: 5, clientY: 300 });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    fireEvent.click(stage, { clientX: 380, clientY: 300 });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    fireEvent.click(stage, { clientX: 380, clientY: 300 });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    fireEvent.click(stage, { clientX: 5, clientY: 300 });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    for (const edge of screen.getByTestId('mobile-gallery-edges').children) expect(edge).toHaveClass('opacity-0', 'duration-200');
    fireEvent.click(stage, { clientX: 380, clientY: 300 });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps a downward swipe vertical after moving sideways and fades with drag progress', () => {
    const onClose = vi.fn();
    render(<ImageViewer images={[{ url: '/a.png', name: 'A' }, { url: '/b.png', name: 'B' }]} onClose={onClose} />);
    const stage = screen.getByTestId('image-viewer-stage');
    const backdrop = screen.getByRole('dialog');
    const alpha = () => Number(backdrop.style.backgroundColor.match(/[\d.]+/g)?.[3] ?? 1);
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 300, clientY: 100, pointerType: 'touch' });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 300, clientY: 140, pointerType: 'touch' });
    const firstAlpha = alpha();
    expect(firstAlpha).toBeLessThan(1);
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 50, clientY: 180, pointerType: 'touch' });
    expect(screen.getByAltText('A').style.transform).toContain('translate(0px, 80px)');
    expect(alpha()).toBeLessThan(firstAlpha);
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 50, clientY: 180, pointerType: 'touch' });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(alpha()).toBe(1);
  });

  it('follows a downward drag and closes a single photo only after a deliberate swipe', () => {
    const { stage, image, onClose } = renderViewer();
    const drag = (dy: number, cancel = false) => {
      fireEvent.pointerDown(stage, { pointerId: 1, clientX: 200, clientY: 100, pointerType: 'touch' });
      fireEvent.pointerMove(stage, { pointerId: 1, clientX: 200, clientY: 100 + dy, pointerType: 'touch' });
      if (dy > 0) expect(image.style.transform).toContain(`, ${dy}px)`);
      const finish = cancel ? fireEvent.pointerCancel : fireEvent.pointerUp;
      finish(stage, { pointerId: 1, clientX: 200, clientY: 100 + dy, pointerType: 'touch' });
    };
    drag(40);
    drag(-150);
    drag(150, true);
    expect(onClose).not.toHaveBeenCalled();
    expect(image.style.transform).toContain(', 0px)');
    drag(150);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pans a zoomed photo instead of dismissing it on a downward swipe', () => {
    const { stage, onClose } = renderViewer();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 200, clientY: 100, pointerType: 'touch' });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 200, clientY: 300, pointerType: 'touch' });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 200, clientY: 300, pointerType: 'touch' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reveals the adjacent photo during the drag, before changing the current photo', () => {
    render(<ImageViewer images={[{ url: '/first.png', name: 'First' }, { url: '/second.png', name: 'Second' }]} onClose={vi.fn()} />);
    const stage = screen.getByTestId('image-viewer-stage');
    const next = screen.getByTestId('image-viewer-next-slide');
    expect(next.querySelector('img')).toHaveAttribute('src', '/second.png');
    expect(next.querySelector('img')).toHaveAttribute('loading', 'eager');
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 300, clientY: 200, pointerType: 'touch' });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 180, clientY: 200, pointerType: 'touch' });
    expect(next.style.transform).toBe('translateX(calc(100% + -120px))');
    expect(next.style.transition).toBe('none');
    expect(screen.getByAltText('First')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 180, clientY: 200, pointerType: 'touch' });
    expect(screen.getByAltText('Second')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    const previous = screen.getByTestId('image-viewer-previous-slide');
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 180, clientY: 200, pointerType: 'touch' });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 210, clientY: 200, pointerType: 'touch' });
    expect(previous.style.transform).toBe('translateX(calc(-100% + 30px))');
    fireEvent.pointerUp(stage, { pointerId: 2, clientX: 210, clientY: 200, pointerType: 'touch' });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(previous.style.transform).toBe('translateX(calc(-100% + 0px))');
  });

  it('keeps right-clicks and clicks away from the message behind it', () => {
    const { parent, stage, image } = renderViewer();
    const menu = fireEvent.contextMenu(image);
    fireEvent.pointerDown(stage);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(menu).toBe(false);
    expect(parent.onContextMenu).not.toHaveBeenCalled();
    expect(parent.onPointerDown).not.toHaveBeenCalled();
    expect(parent.onClick).not.toHaveBeenCalled();
  });

  it('zooms with the wheel through a listener that may block page scrolling', () => {
    const { stage, image } = renderViewer();
    const wheel = new WheelEvent('wheel', { deltaY: -200, cancelable: true, bubbles: true });
    act(() => { stage.dispatchEvent(wheel); });
    expect(wheel.defaultPrevented).toBe(true);
    expect(image.style.transform).toMatch(/scale\(1\.[4-6]\d*\)/);
  });

  it('shows the thumbnail until the full image has loaded', () => {
    render(<ImageViewer images={[{ url: '/photo.png', name: 'photo.png', previewUrl: '/thumb.png' }]} onClose={vi.fn()} />);
    const image = screen.getByAltText('photo.png');
    expect(screen.getByTestId('image-viewer-preview').getAttribute('src')).toBe('/thumb.png');
    expect(image.className).toContain('opacity-0');
    fireEvent.load(image);
    expect(screen.queryByTestId('image-viewer-preview')).toBeNull();
    expect(image.className).toContain('opacity-100');
  });

  it('shows an image that is already loaded at once, without a fade or a spinner', () => {
    const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(512);
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    render(<ImageViewer images={[{ url: '/avatar.png', name: 'avatar.png' }]} onClose={vi.fn()} />);
    expect(screen.getByAltText('avatar.png').className).toContain('opacity-100');
    expect(screen.queryByTestId('image-viewer-loading')).toBeNull();
    naturalWidth.mockRestore();
    complete.mockRestore();
  });

  it('treats a click on the shown thumbnail as a click on the picture while the full image loads', () => {
    const onClose = vi.fn();
    render(<ImageViewer images={[{ url: '/photo.png', name: 'photo.png', previewUrl: '/thumb.png' }]} onClose={onClose} />);
    const preview = screen.getByTestId('image-viewer-preview');
    Object.defineProperty(preview, 'naturalWidth', { value: 320 });
    Object.defineProperty(preview, 'naturalHeight', { value: 160 });
    preview.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }) as DOMRect;
    const stage = screen.getByTestId('image-viewer-stage');

    fireEvent.click(stage, { clientX: 400, clientY: 300 });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(stage, { clientX: 400, clientY: 40 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a small spinner while an image without a thumbnail loads', () => {
    const { image } = renderViewer();
    expect(screen.getByTestId('image-viewer-loading')).toBeTruthy();
    fireEvent.load(image);
    expect(screen.queryByTestId('image-viewer-loading')).toBeNull();
  });

  it('closes on Escape and when the backdrop is clicked', () => {
    const { onClose, stage } = renderViewer();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(stage, { clientX: 5, clientY: 5 });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps keyboard shortcuts working while a viewer button has focus', () => {
    const { onClose } = renderViewer();
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    zoomIn.focus();
    fireEvent.keyDown(zoomIn, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the viewer and gives it back to the opener on close', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<ImageViewer images={[{ url: '/photo.png', name: 'photo.png' }]} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    unmount();
    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });

  it('has no gallery controls for a single image', () => {
    renderViewer();
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });
});

describe('ImageViewer download and errors', () => {
  it('downloads through the authenticated media request with the given file name', async () => {
    const createObjectURL = vi.fn(() => 'blob:avatar');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ImageViewer images={[{ url: '/api/v2/users/7/avatar', name: 'Alice avatar', downloadName: 'alice-avatar-1.jpg' }]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(fetchMedia).toHaveBeenCalledWith('/api/v2/users/7/avatar', { credentials: 'include' });
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('alice-avatar-1.jpg');
    expect((click.mock.contexts[0] as HTMLAnchorElement).href).toBe('blob:avatar');
    click.mockRestore();
  });

  it('shows a placeholder instead of a broken image and hides its download', () => {
    render(<ImageViewer images={[{ url: '/missing.png', name: 'missing.png' }]} onClose={vi.fn()} />);
    fireEvent.error(screen.getByAltText('missing.png'));
    expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });
});

describe('ImageViewer gallery', () => {
  const images = ['a', 'b', 'c'].map((name) => ({ url: `/${name}.png`, name: `${name}.png` }));
  const renderGallery = (initialIndex = 1) => {
    render(<ImageViewer images={images} initialIndex={initialIndex} onClose={vi.fn()} />);
    return { stage: screen.getByTestId('image-viewer-stage') };
  };
  const shown = () => screen.getByRole('dialog').getAttribute('aria-label');

  it('opens at the clicked image and moves with the side buttons', () => {
    renderGallery();
    expect(shown()).toBe('b.png');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(shown()).toBe('c.png');
    expect(screen.getByRole('button', { name: 'Next image' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(shown()).toBe('a.png');
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeDisabled();
  });

  it('moves with the arrow keys', () => {
    renderGallery(0);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(shown()).toBe('b.png');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(shown()).toBe('a.png');
  });

  it('moves with a horizontal swipe but not with a short or vertical drag', () => {
    const { stage } = renderGallery();
    const drag = (dx: number, dy: number, id: number) => {
      fireEvent.pointerDown(stage, { pointerId: id, clientX: 200, clientY: 200, pointerType: 'touch' });
      fireEvent.pointerMove(stage, { pointerId: id, clientX: 200 + dx, clientY: 200 + dy, pointerType: 'touch' });
      fireEvent.pointerUp(stage, { pointerId: id, clientX: 200 + dx, clientY: 200 + dy, pointerType: 'touch' });
    };
    drag(-30, 0, 1);
    drag(-10, -150, 2);
    expect(shown()).toBe('b.png');
    drag(-150, 10, 3);
    expect(shown()).toBe('c.png');
    drag(150, 0, 4);
    expect(shown()).toBe('b.png');
  });
});
