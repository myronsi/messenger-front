import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
