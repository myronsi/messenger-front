import { onAccountCleared } from '@/shared/auth/accountStorage';

const STORE_KEY = 'avatar-blur-v1';
const LIMIT = 200;
const SAMPLE = 6;
const SIZE = 24;
const SAVE_DELAY_MS = 1000;
const USER_AVATAR = /\/users\/[^/?#]+\/avatar(?:[?#]|$)/;

export const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

let memory: Map<string, string> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const store = () => {
  if (memory) return memory;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Record<string, unknown>;
    memory = new Map(Object.entries(saved).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    memory = new Map();
  }
  return memory;
};

const saveSoon = () => {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(store())));
    } catch {
      return;
    }
  }, SAVE_DELAY_MS);
};

export const isAvatarSource = (src?: string) => !!src && USER_AVATAR.test(src);

export const avatarBlur = (key?: string) => (key ? store().get(key) : undefined);

export const blurredCopy = (image: HTMLImageElement) => {
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (!side) return null;
  const sample = document.createElement('canvas');
  sample.width = SAMPLE;
  sample.height = SAMPLE;
  const output = document.createElement('canvas');
  output.width = SIZE;
  output.height = SIZE;
  const sampleContext = sample.getContext('2d');
  const outputContext = output.getContext('2d');
  if (!sampleContext || !outputContext) return null;
  sampleContext.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, SAMPLE, SAMPLE);
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = 'high';
  outputContext.drawImage(sample, 0, 0, SIZE, SIZE);
  return output.toDataURL('image/jpeg', 0.7);
};

export const rememberAvatarBlur = (key: string, image: HTMLImageElement) => {
  const saved = store();
  if (saved.has(key)) return;
  let copy: string | null;
  try {
    copy = blurredCopy(image);
  } catch {
    return;
  }
  if (!copy) return;
  saved.set(key, copy);
  while (saved.size > LIMIT) saved.delete(saved.keys().next().value as string);
  saveSoon();
};

onAccountCleared(() => {
  memory = null;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = undefined;
});
