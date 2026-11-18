import { getExtension, UPLOAD_LIMIT_BYTES } from './uploadValidation';

export const MAX_IMAGE_EDGE = 2560;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;
const RETRY_SCALE = 0.75;
const MAX_ATTEMPTS = 4;
const MIN_SAVING = 0.9;
const SMALL_FILE = 300 * 1024;
const WORKER_TIMEOUT_MS = 30_000;

const COMPRESSIBLE = new Map([['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]);
const originals = new WeakMap<File, File>();

export const originalOf = (file: File) => originals.get(file);

const sourceType = (file: File) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file.type;
  return file.type && file.type !== 'application/octet-stream' ? undefined : COMPRESSIBLE.get(getExtension(file.name));
};

const hasCanvas = () => typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined';

export const canCompressImage = (file: File) => typeof createImageBitmap === 'function' && hasCanvas() && !!sourceType(file);

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
interface Surface { canvas: HTMLCanvasElement | OffscreenCanvas; context: Context }

const surface = (width: number, height: number): Surface | null => {
  if (typeof document === 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    return context ? { canvas, context } : null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  return context ? { canvas, context } : null;
};

const toBlob = (target: Surface, type: string, quality?: number): Promise<Blob | null> => {
  const { canvas } = target;
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality }).catch(() => null);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
};

const hasTransparency = (context: Context, width: number, height: number) => {
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
  const target = surface(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
  if (!target) return null;
  const { canvas, context } = target;
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return target;
};

const encode = async (bitmap: ImageBitmap, initialScale: number, mayBeTransparent: boolean, limit: number) => {
  let scale = initialScale;
  let transparent: boolean | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const drawn = draw(bitmap, scale);
    if (!drawn) return null;
    const webp = await toBlob(drawn, 'image/webp', WEBP_QUALITY);
    if (webp?.type === 'image/webp') {
      if (webp.size <= limit) return webp;
      scale *= RETRY_SCALE;
      continue;
    }
    transparent ??= mayBeTransparent && hasTransparency(drawn.context, drawn.canvas.width, drawn.canvas.height);
    if (transparent) {
      const png = await toBlob(drawn, 'image/png');
      if (png && png.size <= limit) return png;
    }
    const flat = draw(bitmap, scale, '#ffffff');
    const jpeg = flat && await toBlob(flat, 'image/jpeg', JPEG_QUALITY);
    if (!jpeg) return null;
    if (jpeg.size <= limit) return jpeg;
    scale *= RETRY_SCALE;
  }
  return null;
};

const extensionOf = (type: string) => (type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg');

export const compressImageForUpload = async (file: File, limit = UPLOAD_LIMIT_BYTES.image): Promise<File> => {
  const type = sourceType(file);
  if (!type || !canCompressImage(file)) return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_IMAGE_EDGE / longEdge);
    if (file.size <= SMALL_FILE && scale === 1) return file;
    const blob = await encode(bitmap, scale, type !== 'image/jpeg', limit);
    if (!blob || (file.size <= limit && blob.size >= file.size * MIN_SAVING)) return file;
    const out = new File([blob], renamed(file.name, extensionOf(blob.type)), { type: blob.type, lastModified: file.lastModified });
    originals.set(out, file);
    return out;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
};

interface WorkerReply { id: number; file: File; changed: boolean }

let worker: Worker | null | undefined;
let sequence = 0;

const compressionWorker = () => {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
      ? new Worker(new URL('./compressImage.worker.ts', import.meta.url), { type: 'module' })
      : null;
    worker?.addEventListener('error', () => { worker = null; });
  } catch {
    worker = null;
  }
  return worker;
};

const compressInWorker = (file: File) => new Promise<File>((resolve) => {
  const target = compressionWorker();
  if (!target) {
    void compressImageForUpload(file).then(resolve);
    return;
  }
  const id = ++sequence;
  const done = (out: File) => {
    window.clearTimeout(timer);
    target.removeEventListener('message', onMessage);
    resolve(out);
  };
  const onMessage = (event: MessageEvent<WorkerReply>) => {
    if (event.data?.id !== id) return;
    if (event.data.changed) originals.set(event.data.file, file);
    done(event.data.changed ? event.data.file : file);
  };
  const timer = window.setTimeout(() => done(file), WORKER_TIMEOUT_MS);
  target.addEventListener('message', onMessage);
  target.postMessage({ id, file });
});

export const compressImagesForUpload = (files: readonly File[]) => Promise.all(files.map((file) => (canCompressImage(file) ? compressInWorker(file) : file)));
