export function thumbnailTarget(sources: (string | undefined)[], opener: HTMLElement | null) {
  const visible = (image: HTMLImageElement) => {
    const rect = image.getBoundingClientRect();
    return !image.closest('.motion-image-viewer-backdrop') && rect.width > 0 && rect.height > 0
      && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  };
  const candidates = [...document.querySelectorAll<HTMLImageElement>('img[data-media-source]')].filter(visible);
  for (const source of sources) {
    if (!source) continue;
    const matches = candidates.filter(image => image.dataset.mediaSource === source);
    const fromOpener = matches.find(image => opener?.contains(image));
    if (fromOpener) return fromOpener;
    if (matches.length) return matches[matches.length - 1];
  }
  const original = opener instanceof HTMLImageElement ? opener : opener?.querySelector('img');
  return original && visible(original) ? original : null;
}
