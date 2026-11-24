import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { APP_LANGUAGES } from '@/shared/lang/languages';
import { loadTranslations } from '@/shared/lang/translations';

await Promise.all(APP_LANGUAGES.map((language) => loadTranslations(language)));

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => undefined, removeListener: () => undefined,
      addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
    }),
  });
}

if (typeof document !== 'undefined' && typeof document.elementFromPoint !== 'function') {
  Object.defineProperty(document, 'elementFromPoint', { writable: true, value: () => null });
}

afterEach(() => cleanup());
