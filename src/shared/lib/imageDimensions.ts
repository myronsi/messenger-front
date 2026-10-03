const STORAGE_KEY = 'image_dimensions';
const MAX_ENTRIES = 500;

export interface ImageDimensions {
  width: number;
  height: number;
}

let cache: Map<string, ImageDimensions> | null = null;

const load = (): Map<string, ImageDimensions> => {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      for (const [url, dims] of Object.entries(JSON.parse(raw) as Record<string, ImageDimensions>)) {
        if (dims && dims.width > 0 && dims.height > 0) cache.set(url, dims);
      }
    }
  } catch {
    cache.clear();
  }
  return cache;
};

export const getImageDimensions = (url: string): ImageDimensions | undefined => load().get(url);

export const rememberImageDimensions = (url: string, width: number, height: number) => {
  if (!(width > 0 && height > 0)) return;
  const entries = load();
  const known = entries.get(url);
  if (known && known.width === width && known.height === height) return;
  entries.delete(url);
  entries.set(url, { width, height });
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // storage full or unavailable: the in-memory cache still works
  }
};

export const clearImageDimensions = () => {
  cache = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
