import { expect, it } from 'vitest';
import { stickerSlugFromHref } from './stickerLink';

it('reads the pack from sticker links of this app only', () => {
  const origin = 'https://app.example.com';
  expect(stickerSlugFromHref('https://app.example.com/stickers/ABCD1234', origin, null)).toBe('ABCD1234');
  expect(stickerSlugFromHref('/stickers/ABCD1234/', origin, null)).toBe('ABCD1234');
  expect(stickerSlugFromHref('https://web.example.com/stickers/ABCD1234', origin, 'https://web.example.com')).toBe('ABCD1234');
  expect(stickerSlugFromHref('https://evil.example.com/stickers/ABCD1234', origin, null)).toBeNull();
  expect(stickerSlugFromHref('https://app.example.com/stickers/ABCD1234/extra', origin, null)).toBeNull();
  expect(stickerSlugFromHref('https://app.example.com/chat/1', origin, null)).toBeNull();
  expect(stickerSlugFromHref('http://[bad', origin, null)).toBeNull();
});
