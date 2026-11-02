export interface ZoomPan {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 5;
export const IDENTITY: ZoomPan = { scale: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const clampZoomPan = ({ scale, x, y }: ZoomPan, image: Size, stage: Size): ZoomPan => {
  const nextScale = clamp(scale, MIN_SCALE, MAX_SCALE);
  const maxX = Math.max(0, (image.width * nextScale - stage.width) / 2);
  const maxY = Math.max(0, (image.height * nextScale - stage.height) / 2);
  return { scale: nextScale, x: clamp(x, -maxX, maxX) || 0, y: clamp(y, -maxY, maxY) || 0 };
};

export const zoomAt = (view: ZoomPan, nextScale: number, point: { x: number; y: number }, image: Size, stage: Size): ZoomPan => {
  const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
  const ratio = scale / view.scale;
  return clampZoomPan({
    scale,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  }, image, stage);
};

export const panBy = (view: ZoomPan, dx: number, dy: number, image: Size, stage: Size): ZoomPan => (
  clampZoomPan({ ...view, x: view.x + dx, y: view.y + dy }, image, stage)
);

export const pinchTo = (view: ZoomPan, nextScale: number, from: { x: number; y: number }, to: { x: number; y: number }, image: Size, stage: Size): ZoomPan => (
  panBy(zoomAt(view, nextScale, from, image, stage), to.x - from.x, to.y - from.y, image, stage)
);

export const wheelZoomFactor = (deltaY: number, deltaMode = 0) => Math.exp(-deltaY * (deltaMode === 1 ? 33 : 1) * 0.002);
