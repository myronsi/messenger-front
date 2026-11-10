import { useEffect, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { loadEmojiIndex, type EmojiIndex } from './emojiSearch';

export const useEmojiIndex = (active: boolean) => {
  const { language } = useLanguage();
  const [index, setIndex] = useState<{ language: string; value: EmojiIndex } | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    let live = true;
    loadEmojiIndex(language).then((value) => { if (live) setIndex({ language, value }); }).catch(() => undefined);
    return () => { live = false; };
  }, [active, language]);
  return index?.value ?? null;
};
