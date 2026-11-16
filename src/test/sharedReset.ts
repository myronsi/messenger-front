import { afterAll, afterEach, vi } from 'vitest';

vi.resetModules();

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
