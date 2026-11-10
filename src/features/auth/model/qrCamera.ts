import { configuredWebOrigin } from '@/shared/lib/webOrigin';

export type QrFrameDecoder = (video: HTMLVideoElement) => Promise<string | null>;
export type CameraProblem = 'denied' | 'missing' | 'failed';

interface NativeBarcodeDetector {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
}

interface NativeBarcodeDetectorClass {
  new (options: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

const MAX_FRAME_WIDTH = 640;

const nativeDecoder = async (): Promise<QrFrameDecoder | null> => {
  const Native = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorClass }).BarcodeDetector;
  if (!Native) return null;
  try {
    const formats = Native.getSupportedFormats ? await Native.getSupportedFormats() : ['qr_code'];
    if (!formats.includes('qr_code')) return null;
    const detector = new Native({ formats: ['qr_code'] });
    return async video => (await detector.detect(video))[0]?.rawValue ?? null;
  } catch {
    return null;
  }
};

const libraryDecoder = async (): Promise<QrFrameDecoder> => {
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  return async video => {
    if (!context || !video.videoWidth || !video.videoHeight) return null;
    const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    return jsQR(context.getImageData(0, 0, width, height).data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
  };
};

export const createQrDecoder = async () => (await nativeDecoder()) ?? libraryDecoder();

export const cameraProblem = (error: unknown): CameraProblem => {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'missing';
  return 'failed';
};

export const openRearCamera = () => {
  if (!navigator.mediaDevices?.getUserMedia) return Promise.reject(new DOMException('No camera is available.', 'NotFoundError'));
  return navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
};

export const stopCamera = (stream: MediaStream | null) => {
  stream?.getTracks().forEach(track => track.stop());
};

export const qrCodeOrigins = () => {
  const configured = configuredWebOrigin();
  return configured ? [window.location.origin, configured] : [window.location.origin];
};
