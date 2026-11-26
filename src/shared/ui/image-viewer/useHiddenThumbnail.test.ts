import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useHiddenThumbnail } from './useHiddenThumbnail';

const thumbnail = (source: string) => {
  const place = document.createElement('div');
  place.style.overflow = 'hidden';
  const image = document.createElement('img');
  image.dataset.mediaSource = source;
  image.getBoundingClientRect = () => ({ left: 10, top: 10, right: 110, bottom: 110, width: 100, height: 100, x: 10, y: 10, toJSON: () => ({}) });
  place.append(image);
  document.body.append(place);
  return place;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('useHiddenThumbnail', () => {
  it('leaves the place of the shown media empty and brings it back when the media changes or the viewer closes', () => {
    const first = thumbnail('/a.png');
    const second = thumbnail('/b.png');
    const { rerender, unmount } = renderHook(({ sources }) => useHiddenThumbnail(sources, null), { initialProps: { sources: ['/a.png'] } });
    expect(first.style.visibility).toBe('hidden');
    rerender({ sources: ['/b.png'] });
    expect(first.style.visibility).toBe('');
    expect(second.style.visibility).toBe('hidden');
    rerender({ sources: ['/elsewhere.png'] });
    expect(second.style.visibility).toBe('');
    rerender({ sources: ['/a.png'] });
    unmount();
    expect(first.style.visibility).toBe('');
  });
});
