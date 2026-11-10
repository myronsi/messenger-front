export const STICKER_SIZE = 512;
export const MAX_ZOOM_OVER_COVER = 3;

export interface CropState {
  zoom: number;
  x: number;
  y: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

export const coverZoom = ({ width, height }: ImageSize) => Math.max(width, height) / Math.min(width, height);

export const initialCrop = (size: ImageSize): CropState => ({ zoom: coverZoom(size), x: 0, y: 0 });

export const clampZoom = (zoom: number, size: ImageSize) => Math.min(coverZoom(size) * MAX_ZOOM_OVER_COVER, Math.max(1, zoom));

export const displayedSize = (size: ImageSize, zoom: number, frame: number) => {
  const scale = (frame / Math.max(size.width, size.height)) * zoom;
  return { width: size.width * scale, height: size.height * scale };
};

export const drawCrop = (context: CanvasRenderingContext2D, image: CanvasImageSource, size: ImageSize, crop: CropState, side = STICKER_SIZE) => {
  const drawn = displayedSize(size, crop.zoom, side);
  context.clearRect(0, 0, side, side);
  context.drawImage(image, side / 2 + crop.x * side - drawn.width / 2, side / 2 + crop.y * side - drawn.height / 2, drawn.width, drawn.height);
};

export const renderCrop = (image: CanvasImageSource, size: ImageSize, crop: CropState): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = STICKER_SIZE;
  canvas.height = STICKER_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas is not available'));
  drawCrop(context, image, size, crop);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image export failed'))), 'image/png');
  });
};
