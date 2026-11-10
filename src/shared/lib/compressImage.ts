import { getExtension, UPLOAD_LIMIT_BYTES } from './uploadValidation';

export const MAX_IMAGE_EDGE = 4096;
const JPEG_QUALITY = 0.85;
const RETRY_SCALE = 0.75;
const MAX_ATTEMPTS = 4;

const COMPRESSIBLE = new Map([['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]);

const sourceType = (file: File) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file.type;
  return file.type && file.type !== 'application/octet-stream' ? undefined : COMPRESSIBLE.get(getExtension(file.name));
};

export const canCompressImage = (file: File) =>
  typeof createImageBitmap === 'function' && typeof document !== 'undefined' && !!sourceType(file);

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const hasTransparency = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const { data } = context.getImageData(0, 0, width, height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
};

const renamed = (fileName: string, extension: string) => {
  const dot = fileName.lastIndexOf('.');
  return `${dot < 0 ? fileName : fileName.slice(0, dot)}.${extension}`;
};

const draw = (bitmap: ImageBitmap, scale: number, background?: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, context };
};

const encodePng = async (bitmap: ImageBitmap, scale: number, limit: number) => {
  const drawn = draw(bitmap, scale);
  if (!drawn || !hasTransparency(drawn.context, drawn.canvas.width, drawn.canvas.height)) return null;
  const blob = await toBlob(drawn.canvas, 'image/png');
  return blob && blob.size <= limit ? blob : null;
};

const encodeJpeg = async (bitmap: ImageBitmap, initialScale: number, limit: number) => {
  let scale = initialScale;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const drawn = draw(bitmap, scale, '#ffffff');
    if (!drawn) return null;
    const blob = await toBlob(drawn.canvas, 'image/jpeg', JPEG_QUALITY);
    if (!blob) return null;
    if (blob.size <= limit) return blob;
    scale *= RETRY_SCALE;
  }
  return null;
};

export const compressImageForUpload = async (file: File, limit = UPLOAD_LIMIT_BYTES.image): Promise<File> => {
  const type = sourceType(file);
  if (!type || !canCompressImage(file)) return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (file.size <= limit && longEdge <= MAX_IMAGE_EDGE) return file;
    const scale = Math.min(1, MAX_IMAGE_EDGE / longEdge);
    const png = type === 'image/png' ? await encodePng(bitmap, scale, limit) : null;
    const blob = png ?? await encodeJpeg(bitmap, scale, limit);
    if (!blob || (file.size <= limit && blob.size >= file.size)) return file;
    return new File([blob], png ? renamed(file.name, 'png') : renamed(file.name, 'jpg'), { type: blob.type || (png ? 'image/png' : 'image/jpeg'), lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
};

export const compressImagesForUpload = (files: readonly File[]) => Promise.all(files.map((file) => compressImageForUpload(file)));
