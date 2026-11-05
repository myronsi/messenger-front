export function mobileImageDirection(clientX: number, stage: HTMLElement | null): -1 | 1 | null {
  if (window.innerWidth >= 640 || !stage) return null;
  const rect = stage.getBoundingClientRect();
  const width = rect.width || window.innerWidth;
  const x = clientX - rect.left;
  if (x < 0 || x > width) return null;
  return x <= width * 0.25 ? -1 : x >= width * 0.75 ? 1 : null;
}
