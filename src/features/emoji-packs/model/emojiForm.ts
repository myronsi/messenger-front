import { trimChars } from '@/shared/lib/trimChars';

const SHORTCODE = /^[a-z0-9_]{2,32}$/;

export const isShortcode = (value: string) => SHORTCODE.test(value);

export const shortcodeFromFile = (name: string) => {
  const base = trimChars(name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '_'), '_').slice(0, 32);
  return base.length >= 2 ? base : '';
};

interface ErrorTexts {
  failed: string;
  shortcodeTaken: string;
  limitReached: string;
  imageTooLarge: string;
  imageUnsupported: string;
}

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null && 'status' in error ? (error as { status: unknown }).status : null);
const codeOf = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('data' in error)) return null;
  const data = (error as { data: unknown }).data;
  return typeof data === 'object' && data !== null && 'code' in data ? (data as { code: unknown }).code : null;
};

export const addEmojiError = (error: unknown, t: ErrorTexts) => {
  const status = statusOf(error);
  if (status === 409) return codeOf(error) === 'limit_reached' ? t.limitReached : t.shortcodeTaken;
  if (status === 413) return t.imageTooLarge;
  if (status === 415) return t.imageUnsupported;
  return t.failed;
};
