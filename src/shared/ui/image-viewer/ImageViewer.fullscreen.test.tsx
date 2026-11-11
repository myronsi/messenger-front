import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ImageViewer from './ImageViewer';
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: {} }) }));
vi.mock('@/shared/api/fetchMedia', () => ({ fetchMedia: vi.fn(async () => new Response('png', { status: 200 })) }));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});

afterEach(() => vi.useRealTimers());

it('hides the tools on a tap and shows them again on the next tap, without closing', () => {
  vi.useFakeTimers();
  const onClose = vi.fn();
  render(<ImageViewer images={[{ url: '/photo.png', name: 'photo.png', previewUrl: '/thumb.png' }]} onClose={onClose} />);
  const stage = screen.getByTestId('image-viewer-stage');
  const tools = screen.getByTestId('image-viewer-chrome');
  expect(tools).not.toHaveAttribute('aria-hidden');
  fireEvent.click(stage, { clientX: 400, clientY: 40 });
  act(() => { vi.advanceTimersByTime(300); });
  expect(tools).toHaveAttribute('aria-hidden', 'true');
  expect(tools).toHaveClass('opacity-0');
  fireEvent.click(stage, { clientX: 400, clientY: 300 });
  act(() => { vi.advanceTimersByTime(300); });
  expect(tools).not.toHaveAttribute('aria-hidden');
  expect(onClose).not.toHaveBeenCalled();
});

it('shows the picture edge to edge without padding or rounded corners', () => {
  render(<ImageViewer images={[{ url: '/photo.png', name: 'photo.png' }]} onClose={vi.fn()} />);
  const image = screen.getByAltText('photo.png');
  expect(image).toHaveClass('absolute', 'inset-0', 'h-full', 'w-full', 'object-contain');
  expect(image.className).not.toMatch(/rounded|80vh|80vw/);
  expect(screen.getByTestId('image-viewer-stage').className).not.toMatch(/(^|\s)(p|px|py)-/);
});
