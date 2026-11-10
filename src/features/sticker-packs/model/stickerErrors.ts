import type { Translations } from '@/shared/contexts/LanguageContext';

const statusOf = (error: unknown) => {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
};

export const stickerErrorText = (error: unknown, translations: Translations, limit: 'pack' | 'sticker' = 'sticker') => {
  switch (statusOf(error)) {
    case 413:
      return translations.stickerImageTooLarge;
    case 415:
      return translations.stickerImageUnreadable;
    case 409:
      return limit === 'pack' ? translations.stickerPackLimit : translations.stickerLimit;
    default:
      return translations.stickerSaveFailed;
  }
};
