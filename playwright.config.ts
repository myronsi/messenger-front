import process from 'node:process';
import { defineConfig } from '@playwright/test';

// The Go backend of scripts/backend-up.sh; the app derives the WebSocket URL from the API root.
const DEFAULT_API_URL = 'http://127.0.0.1:8080/api/v2';
const APP_URL = 'http://127.0.0.1:5173';

const apiUrl = process.env.E2E_API_URL ?? process.env.VITE_API_URL ?? DEFAULT_API_URL;

// Unset, the app sends the version of its contract package.
const clientApiVersion = process.env.E2E_CLIENT_API_VERSION ?? process.env.VITE_CLIENT_API_VERSION;

export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: false,
  globalTimeout: 270_000,
  timeout: 60_000,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: APP_URL,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 960 },
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_API_URL: apiUrl,
      ...(clientApiVersion ? { VITE_CLIENT_API_VERSION: clientApiVersion } : {}),
    },
  },
});
