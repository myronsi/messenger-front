import process from 'node:process';
import { defineConfig } from '@playwright/test';

const DEFAULT_API_URL = 'http://127.0.0.1:8000';
const APP_URL = 'http://127.0.0.1:5173';

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const toWebSocketUrl = (value: string) => {
  const url = new URL(value);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return trimTrailingSlashes(url.toString());
};

const apiUrl = trimTrailingSlashes(
  process.env.E2E_API_URL ?? process.env.VITE_BASE_URL ?? DEFAULT_API_URL
);

const webSocketUrl = trimTrailingSlashes(
  process.env.E2E_API_URL
    ? toWebSocketUrl(process.env.E2E_API_URL)
    : process.env.VITE_WS_URL ?? toWebSocketUrl(apiUrl)
);

const clientApiVersion = process.env.E2E_CLIENT_API_VERSION
  ?? process.env.VITE_CLIENT_API_VERSION
  ?? '1.0.0';

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
      VITE_BASE_URL: apiUrl,
      VITE_WS_URL: webSocketUrl,
      VITE_CLIENT_API_VERSION: clientApiVersion,
    },
  },
});
