import { defineConfig, devices } from '@playwright/test';

/**
 * 🎭 Playwright Industrial Configuration — ABDQuiz
 * SmartNavbar E2E tests + axe-core a11y audit.
 *
 * Dev server starts automatically via webServer.
 *
 * ⚠️  REQUIREMENTS:
 *   - Create ABDQuiz/.env.local with:
 *       AUTH_CLIENT_ID=...
 *       AUTH_CLIENT_SECRET=...
 *       AUTH_JWT_SECRET=...
 *   - MongoDB must be running locally
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 90000,
  use: {
    baseURL: 'http://localhost:5020',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry',
  },

  // NOTA: webServer eliminado — usa scripts/run-e2e.sh para arrancar
  // el servidor manualmente (evita problemas con cmd.exe en Windows).

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
