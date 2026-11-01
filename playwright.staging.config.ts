import { defineConfig } from '@playwright/test';

process.env.GO_API_TESTS = '1';

export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: false,
  workers: 1,
  maxFailures: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: 'test-results/go-staging',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://staging.messenger.viserix.com',
    serviceWorkers: 'block',
    viewport: { width: 1440, height: 960 },
    trace: 'off',
  },
});
