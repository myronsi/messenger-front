import { describe, expect, it } from 'vitest';
import { mayBeAnimatedWebP } from './animatedWebP';

describe('mayBeAnimatedWebP', () => {
  it('treats a WebP without a display copy as possibly animated', () => {
    expect(mayBeAnimatedWebP({ file_type: 'image/webp', file_size: 400_000 })).toBe(true);
    expect(mayBeAnimatedWebP({ file_type: 'image/webp', file_size: 400_000, display_url: '/display' })).toBe(false);
    expect(mayBeAnimatedWebP({ file_type: 'image/jpeg', file_size: 400_000 })).toBe(false);
    expect(mayBeAnimatedWebP({ file_type: 'image/webp', file_size: 20 << 20 })).toBe(false);
  });
});
