const cache = new Map<string, string | null>();
const MAX_CACHED = 400;

const decodeBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const thumbHashAspect = (hash: Uint8Array) => {
  const header = hash[3];
  const hasAlpha = hash[2] & 0x80;
  const landscape = hash[4] & 0x80;
  const lx = landscape ? (hasAlpha ? 5 : 7) : header & 7;
  const ly = landscape ? header & 7 : (hasAlpha ? 5 : 7);
  return lx / ly;
};

export const thumbHashToRGBA = (hash: Uint8Array) => {
  const header24 = hash[0] | (hash[1] << 8) | (hash[2] << 16);
  const header16 = hash[3] | (hash[4] << 8);
  const lDC = (header24 & 63) / 63;
  const pDC = ((header24 >> 6) & 63) / 31.5 - 1;
  const qDC = ((header24 >> 12) & 63) / 31.5 - 1;
  const lScale = ((header24 >> 18) & 31) / 31;
  const hasAlpha = (header24 >> 23) !== 0;
  const pScale = ((header16 >> 3) & 63) / 63;
  const qScale = ((header16 >> 9) & 63) / 63;
  const landscape = (header16 >> 15) !== 0;
  const lx = Math.max(3, landscape ? (hasAlpha ? 5 : 7) : header16 & 7);
  const ly = Math.max(3, landscape ? header16 & 7 : (hasAlpha ? 5 : 7));
  const aDC = hasAlpha ? (hash[5] & 15) / 15 : 1;
  const aScale = (hash[5] >> 4) / 15;
  const acStart = hasAlpha ? 6 : 5;
  let acIndex = 0;
  const channel = (nx: number, ny: number, scale: number) => {
    const ac: number[] = [];
    for (let cy = 0; cy < ny; cy += 1) {
      for (let cx = cy ? 0 : 1; cx * ny < nx * (ny - cy); cx += 1) {
        const nibble = (hash[acStart + (acIndex >> 1)] >> ((acIndex & 1) << 2)) & 15;
        ac.push((nibble / 7.5 - 1) * scale);
        acIndex += 1;
      }
    }
    return ac;
  };
  const lAC = channel(lx, ly, lScale);
  const pAC = channel(3, 3, pScale * 1.25);
  const qAC = channel(3, 3, qScale * 1.25);
  const aAC = hasAlpha ? channel(5, 5, aScale) : [];
  const ratio = thumbHashAspect(hash);
  const w = Math.round(ratio > 1 ? 32 : 32 * ratio);
  const h = Math.round(ratio > 1 ? 32 / ratio : 32);
  const rgba = new Uint8ClampedArray(w * h * 4);
  const fx: number[] = [];
  const fy: number[] = [];
  for (let y = 0, i = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1, i += 4) {
      let l = lDC;
      let p = pDC;
      let q = qDC;
      let a = aDC;
      for (let cx = 0, n = Math.max(lx, hasAlpha ? 5 : 3); cx < n; cx += 1) fx[cx] = Math.cos((Math.PI / w) * (x + 0.5) * cx);
      for (let cy = 0, n = Math.max(ly, hasAlpha ? 5 : 3); cy < n; cy += 1) fy[cy] = Math.cos((Math.PI / h) * (y + 0.5) * cy);
      for (let cy = 0, j = 0; cy < ly; cy += 1) {
        for (let cx = cy ? 0 : 1, fy2 = fy[cy] * 2; cx * ly < lx * (ly - cy); cx += 1, j += 1) l += lAC[j] * fx[cx] * fy2;
      }
      for (let cy = 0, j = 0; cy < 3; cy += 1) {
        for (let cx = cy ? 0 : 1, fy2 = fy[cy] * 2; cx < 3 - cy; cx += 1, j += 1) {
          const f = fx[cx] * fy2;
          p += pAC[j] * f;
          q += qAC[j] * f;
        }
      }
      if (hasAlpha) {
        for (let cy = 0, j = 0; cy < 5; cy += 1) {
          for (let cx = cy ? 0 : 1, fy2 = fy[cy] * 2; cx < 5 - cy; cx += 1, j += 1) a += aAC[j] * fx[cx] * fy2;
        }
      }
      const b = l - (2 / 3) * p;
      const r = (3 * l - b + q) / 2;
      const g = r - q;
      rgba[i] = 255 * Math.min(1, Math.max(0, r));
      rgba[i + 1] = 255 * Math.min(1, Math.max(0, g));
      rgba[i + 2] = 255 * Math.min(1, Math.max(0, b));
      rgba[i + 3] = 255 * Math.min(1, Math.max(0, a));
    }
  }
  return { w, h, rgba };
};

const toDataURL = (w: number, h: number, rgba: Uint8ClampedArray<ArrayBuffer>) => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.putImageData(new ImageData(rgba, w, h), 0, 0);
  return canvas.toDataURL('image/png');
};

export const placeholderDataURL = (placeholder?: string | null): string | undefined => {
  if (!placeholder) return undefined;
  if (cache.has(placeholder)) return cache.get(placeholder) ?? undefined;
  let url: string | null = null;
  try {
    const hash = decodeBase64(placeholder);
    if (hash.length >= 5) {
      const { w, h, rgba } = thumbHashToRGBA(hash);
      url = toDataURL(w, h, rgba);
    }
  } catch {
    url = null;
  }
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
  cache.set(placeholder, url);
  return url ?? undefined;
};
