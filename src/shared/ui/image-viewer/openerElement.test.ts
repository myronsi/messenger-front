import { afterEach, expect, it } from 'vitest';
import { openerElement } from './openerElement';
import { thumbnailTarget } from './thumbnailTarget';

const thumbnail = (source: string) => {
  const image = document.createElement('img');
  image.dataset.mediaSource = source;
  image.getBoundingClientRect = () => ({ width: 100, height: 100, top: 10, bottom: 110, left: 10, right: 110 }) as DOMRect;
  document.body.append(image);
  return image;
};

afterEach(() => { document.body.innerHTML = ''; });

it('returns to the copy that was pressed when two messages show the same picture', () => {
  const first = thumbnail('/a.png');
  const second = thumbnail('/a.png');
  second.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  const opener = openerElement();
  expect(opener).toBe(second);
  expect(thumbnailTarget(['/a.png'], opener)).toBe(second);
  expect(thumbnailTarget(['/a.png'], opener)).not.toBe(first);
});
