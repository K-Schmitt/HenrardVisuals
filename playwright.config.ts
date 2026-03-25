import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests require a running app + Supabase instance.
 *
 * Local development setup:
 *   1. supabase start          (starts local Supabase on port 54321)
 *   2. cp .env.example .env.local  (set VITE_SUPABASE_URL=http://localhost:54321, etc.)
 *   3. pnpm e2e                (starts Vite dev server + runs Playwright)
 *
 * CI: set PLAYWRIGHT_BASE_URL env var to the staging URL.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: process.env['PLAYWRIGHT_BASE_URL']
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env['CI'],
        timeout: 60_000,
      },
});
