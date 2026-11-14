import type { Translations } from '@/shared/contexts/LanguageContext';

export const selfName = (name: string, translations: Translations) => translations.chatOrganizer.selfName.replace('{name}', name);
