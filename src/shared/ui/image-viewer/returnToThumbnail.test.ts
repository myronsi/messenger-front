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

it('shrinks a profile picture back into the circle around it', () => {
  const image = document.createElement('img');
  image.src = 'blob:avatar';
  Object.defineProperty(image, 'naturalWidth', { value: 512 });
  Object.defineProperty(image, 'naturalHeight', { value: 512 });
  image.getBoundingClientRect = () => rect(0, 100, 400, 400);
  const circle = document.createElement('div');
  circle.style.borderRadius = '9999px';
  const button = document.createElement('button');
  const target = document.createElement('img');
  for (const element of [circle, button, target]) element.getBoundingClientRect = () => rect(24, 60, 104, 104);
  button.append(target);
  circle.append(button);
  document.body.append(circle);
  const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
  const original = Element.prototype.animate;
  Element.prototype.animate = animate;
  try {
    returnToThumbnail(image, target, { duration: 320 });
    expect((animate.mock.calls[0] as unknown[][])[0][1]).toMatchObject({ width: '104px', height: '104px', borderRadius: '50%' });
  } finally {
    Element.prototype.animate = original;
  }
});

it('ignores the rounded corners of a bigger box around a square thumbnail', () => {
  const image = document.createElement('img');
  image.src = 'blob:photo';
  Object.defineProperty(image, 'naturalWidth', { value: 400 });
  Object.defineProperty(image, 'naturalHeight', { value: 400 });
  image.getBoundingClientRect = () => rect(0, 0, 400, 400);
  const card = document.createElement('div');
  card.style.borderRadius = '16px';
  card.getBoundingClientRect = () => rect(0, 0, 300, 200);
  const target = document.createElement('img');
  target.getBoundingClientRect = () => rect(10, 10, 80, 80);
  card.append(target);
  document.body.append(card);
  const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
  const original = Element.prototype.animate;
  Element.prototype.animate = animate;
  try {
    returnToThumbnail(image, target, { duration: 320 });
    expect((animate.mock.calls[0] as unknown[][])[0][1]).toMatchObject({ borderRadius: '0px' });
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

it('carries the strokes of a drawing into the thumbnail and gives them back afterwards', () => {
  const stage = document.createElement('div');
  const image = document.createElement('img');
  image.src = 'blob:drawn-photo';
  Object.defineProperty(image, 'naturalWidth', { value: 800 });
  Object.defineProperty(image, 'naturalHeight', { value: 400 });
  image.getBoundingClientRect = () => rect(0, 0, 800, 400);
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.setAttribute('data-testid', 'drawing-overlay');
  overlay.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  overlay.setAttribute('class', 'absolute inset-0');
  overlay.style.transform = 'scale(2)';
  overlay.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
  stage.append(image, overlay);
  const target = document.createElement('img');
  target.getBoundingClientRect = () => rect(10, 10, 80, 80);
  document.body.append(stage, target);
  const original = Element.prototype.animate;
  Element.prototype.animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
  try {
    const result = returnToThumbnail(image, target, { duration: 320 });
    const strokes = document.body.querySelector<SVGSVGElement>('div[aria-hidden="true"] svg');
    expect(strokes?.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice');
    expect(strokes?.querySelector('path')).not.toBeNull();
    expect(strokes?.style.transform).toBe('none');
    expect(strokes?.style.width).toBe('100%');
    expect(overlay.style.visibility).toBe('hidden');
    result?.cleanup();
    expect(overlay.style.visibility).toBe('');
    expect(document.body.querySelector('div[aria-hidden="true"]')).toBeNull();
  } finally {
    Element.prototype.animate = original;
  }
});
