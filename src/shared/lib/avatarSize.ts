const USER_AVATAR = /\/users\/[^/?#]+\/avatar(?:\?|$)/;
const BUCKETS = [64, 128, 256];
const DEFAULT_SIZE = 128;

export const avatarSizeFor = (cssPixels: number, ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1) => {
  if (!cssPixels || cssPixels <= 0) return DEFAULT_SIZE;
  const wanted = Math.ceil(cssPixels * ratio);
  return BUCKETS.find((bucket) => wanted <= bucket);
};

export const sizedAvatarUrl = (src: string | undefined, cssPixels: number) => {
  if (!src || !USER_AVATAR.test(src) || /[?&]size=/.test(src)) return src;
  const size = avatarSizeFor(cssPixels);
  if (!size) return src;
  return `${src}${src.includes('?') ? '&' : '?'}size=${size}`;
};
