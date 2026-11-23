import { afterEach, expect, it, vi } from 'vitest';
import { flyFromThumbnail } from './flyFromThumbnail';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

it('flies the thumbnail with its strokes from the chat into the space of the full photo', () => {
  const frame = document.createElement('div');
  frame.style.overflow = 'hidden';
  frame.style.borderTopLeftRadius = '12px';
  frame.getBoundingClientRect = () => rect(30, 400, 200, 150);
  const thumbnail = document.createElement('img');
  thumbnail.src = 'blob:thumb';
  Object.defineProperty(thumbnail, 'naturalWidth', { value: 480 });
  Object.defineProperty(thumbnail, 'naturalHeight', { value: 240 });
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.setAttribute('data-testid', 'drawing-overlay');
  overlay.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
  frame.append(thumbnail, overlay);
  const stage = document.createElement('div');
  stage.getBoundingClientRect = () => rect(0, 50, 400, 600);
  document.body.append(frame, stage);
  const animate = vi.fn(() => ({ cancel: vi.fn(), finished: Promise.resolve() }) as unknown as Animation);
  const original = Element.prototype.animate;
  Element.prototype.animate = animate;
  try {
    const flight = flyFromThumbnail(thumbnail, stage, { duration: 300 });
    expect(animate.mock.calls[0]).toEqual([
      [
        { left: '30px', top: '400px', width: '200px', height: '150px', borderRadius: '12px' },
        { left: '0px', top: '250px', width: '400px', height: '200px', borderRadius: '0px' },
      ], { duration: 300 },
    ]);
    const shell = document.body.querySelector('[data-open-flight]');
    expect(shell?.querySelector('img')).toHaveProperty('src', 'blob:thumb');
    expect(shell?.querySelector('svg')?.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice');
    expect(stage.style.visibility).toBe('hidden');
    flight?.cleanup();
    expect(document.body.querySelector('[data-open-flight]')).toBeNull();
    expect(stage.style.visibility).toBe('');
  } finally {
    Element.prototype.animate = original;
  }
});

it('does not fly a thumbnail that has not loaded', () => {
  const thumbnail = document.createElement('img');
  const stage = document.createElement('div');
  expect(flyFromThumbnail(thumbnail, stage)).toBeNull();
  expect(stage.style.visibility).toBe('');
});
