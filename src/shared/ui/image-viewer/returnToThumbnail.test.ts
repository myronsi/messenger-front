import { afterEach, expect, it, vi } from 'vitest';
import { returnToThumbnail } from './returnToThumbnail';
import { thumbnailTarget } from './thumbnailTarget';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

it.each(['50%', '8px'])('lands at the exact thumbnail bounds with radius %s and cleans up the clone', radius => {
  const image = document.createElement('img');
  image.src = 'blob:full-photo';
  Object.defineProperty(image, 'naturalWidth', { value: 800 });
  Object.defineProperty(image, 'naturalHeight', { value: 400 });
  image.getBoundingClientRect = () => rect(20, 150, 600, 600);
  const target = document.createElement('img');
  target.style.borderRadius = radius;
  target.getBoundingClientRect = () => rect(40, 70, 80, 80);
  document.body.append(target);
  const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
  const original = Element.prototype.animate;
  Element.prototype.animate = animate;
  try {
    const result = returnToThumbnail(image, target, { duration: 320 });
    expect(animate.mock.calls[0]).toEqual([
      [
        { left: '20px', top: '300px', width: '600px', height: '300px', borderRadius: '8px' },
        { left: '40px', top: '70px', width: '80px', height: '80px', borderRadius: radius },
      ], { duration: 320 },
    ]);
    expect(document.body.querySelector('div[aria-hidden="true"] img')).toHaveProperty('src', 'blob:full-photo');
    expect(image.style.visibility).toBe('hidden');
    result?.cleanup();
    expect(document.body.querySelector('div[aria-hidden="true"]')).toBeNull();
    expect(image.style.visibility).toBe('');
  } finally {
    Element.prototype.animate = original;
  }
});

it('finds the matching visible thumbnail rather than another image or the viewer itself', () => {
  const thumb = document.createElement('img');
  thumb.dataset.mediaSource = '/photo';
  thumb.getBoundingClientRect = () => rect(10, 20, 50, 50);
  const viewer = document.createElement('div');
  viewer.className = 'motion-image-viewer-backdrop';
  const full = thumb.cloneNode() as HTMLImageElement;
  full.getBoundingClientRect = () => rect(0, 0, 400, 400);
  viewer.append(full);
  document.body.append(thumb, viewer);
  expect(thumbnailTarget(['/photo'], null)).toBe(thumb);
  thumb.getBoundingClientRect = () => rect(10, -100, 50, 50);
  expect(thumbnailTarget(['/photo'], null)).toBeNull();
});
