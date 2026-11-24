import { afterAll, afterEach, vi } from 'vitest';

vi.resetModules();

const [{ APP_LANGUAGES }, { loadTranslations }] = await Promise.all([
  import('@/shared/lang/languages'),
  import('@/shared/lang/translations'),
]);
await Promise.all(APP_LANGUAGES.map((language) => loadTranslations(language)));

afterEach(() => {
  vi.useRealTimers();
  if (typeof localStorage !== 'undefined') localStorage.clear();
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
});

afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
