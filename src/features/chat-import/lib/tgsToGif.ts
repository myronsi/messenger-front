import { gunzipSync, strFromU8 } from 'fflate';

export const TGS_SIDE = 512;
export const TGS_FPS = 25;
export const TGS_MAX_SECONDS = 3;
const TGS_LOAD_TIMEOUT_MS = 5000;

interface LottieData {
  fr?: number;
  ip?: number;
  op?: number;
}

export const readTgs = async (file: Blob): Promise<LottieData | null> => {
  try {
    const data = JSON.parse(strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer())))) as unknown;
    return data && typeof data === 'object' ? data as LottieData : null;
  } catch {
    return null;
  }
};

export const tgsFrameTimes = (data: LottieData) => {
  const rate = data.fr && data.fr > 0 ? data.fr : 60;
  const frames = Math.max(1, (data.op ?? 0) - (data.ip ?? 0));
  const seconds = Math.min(frames / rate, TGS_MAX_SECONDS);
  const count = Math.max(1, Math.round(seconds * TGS_FPS));
  return Array.from({ length: count }, (_, index) => (data.ip ?? 0) + (index * rate) / TGS_FPS);
};

interface LoadingAnimation {
  isLoaded: boolean;
  addEventListener: (name: 'DOMLoaded' | 'data_failed', callback: () => void) => unknown;
}

const loaded = (animation: LoadingAnimation) => new Promise<boolean>((resolve) => {
  if (animation.isLoaded) {
    resolve(true);
    return;
  }
  const timer = setTimeout(() => resolve(false), TGS_LOAD_TIMEOUT_MS);
  animation.addEventListener('DOMLoaded', () => {
    clearTimeout(timer);
    resolve(true);
  });
  animation.addEventListener('data_failed', () => {
    clearTimeout(timer);
    resolve(false);
  });
});

const svgImage = async (svg: SVGSVGElement) => {
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const tgsToGif = async (file: Blob): Promise<Blob | null> => {
  const data = await readTgs(file);
  if (!data || typeof document === 'undefined') return null;
  const [{ default: lottie }, { GIFEncoder, applyPalette, quantize }] = await Promise.all([
    import('lottie-web/build/player/lottie_light'),
    import('gifenc'),
  ]);
  const stage = document.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  stage.style.cssText = `position:fixed;left:-${TGS_SIDE * 4}px;top:0;width:${TGS_SIDE}px;height:${TGS_SIDE}px;pointer-events:none;`;
  document.body.appendChild(stage);
  const canvas = document.createElement('canvas');
  canvas.width = TGS_SIDE;
  canvas.height = TGS_SIDE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const animation = lottie.loadAnimation({
    container: stage, renderer: 'svg', loop: false, autoplay: false, animationData: data,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false },
  });
  try {
    const svg = stage.querySelector('svg');
    if (!context || !svg || !await loaded(animation)) return null;
    svg.setAttribute('width', String(TGS_SIDE));
    svg.setAttribute('height', String(TGS_SIDE));
    const gif = GIFEncoder();
    for (const frame of tgsFrameTimes(data)) {
      animation.goToAndStop(frame, true);
      context.clearRect(0, 0, TGS_SIDE, TGS_SIDE);
      context.drawImage(await svgImage(svg), 0, 0, TGS_SIDE, TGS_SIDE);
      const rgba = context.getImageData(0, 0, TGS_SIDE, TGS_SIDE).data;
      const palette = quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true });
      const transparentIndex = palette.findIndex((color) => color[3] === 0);
      gif.writeFrame(applyPalette(rgba, palette, 'rgba4444'), TGS_SIDE, TGS_SIDE, {
        palette, delay: 1000 / TGS_FPS, transparent: transparentIndex >= 0, transparentIndex: Math.max(0, transparentIndex), dispose: 2,
      });
    }
    gif.finish();
    return new Blob([gif.bytes()], { type: 'image/gif' });
  } catch {
    return null;
  } finally {
    animation.destroy();
    stage.remove();
  }
};
