import { pictureRect } from './pictureRect';

export function returnToThumbnail(image: HTMLImageElement, target: HTMLImageElement, options: KeyframeAnimationOptions) {
  const from = pictureRect(image);
  let startRadius = '8px';
  const clip = image.style.clipPath.match(/^inset\((.*?) round ([\d.]+)px\)$/);
  if (clip && image.offsetWidth) {
    const box = image.getBoundingClientRect();
    const scale = box.width / image.offsetWidth;
    const values = clip[1].split(/\s+/).map(parseFloat);
    const [top, right = top, bottom = top, left = right] = values;
    from.left = box.left + left * scale;
    from.top = box.top + top * scale;
    from.right = box.right - right * scale;
    from.bottom = box.bottom - bottom * scale;
    startRadius = `${Number(clip[2]) * scale}px`;
  }
  const parent = target.parentElement;
  const clipped = parent && getComputedStyle(parent).overflow === 'hidden' ? parent : target;
  const to = clipped.getBoundingClientRect();
  const width = from.right - from.left;
  const height = from.bottom - from.top;
  if (!image.naturalWidth || !width || !height) return null;
  const shell = document.createElement('div');
  Object.assign(shell.style, {
    position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${width}px`, height: `${height}px`,
    overflow: 'hidden', pointerEvents: 'none', zIndex: '10002', borderRadius: startRadius,
  });
  shell.setAttribute('aria-hidden', 'true');
  const clone = document.createElement('img');
  clone.src = image.currentSrc || image.src;
  Object.assign(clone.style, { width: '100%', height: '100%', objectFit: 'cover', objectPosition: getComputedStyle(target).objectPosition });
  shell.append(clone);
  document.body.append(shell);
  const previousVisibility = image.style.visibility;
  image.style.visibility = 'hidden';
  const radius = getComputedStyle(clipped).borderRadius || '0px';
  const animation = shell.animate([
    { left: `${from.left}px`, top: `${from.top}px`, width: `${width}px`, height: `${height}px`, borderRadius: startRadius },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: radius },
  ], options);
  return { animation, cleanup: () => { shell.remove(); image.style.visibility = previousVisibility; } };
}
