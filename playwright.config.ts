import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright smoke E2E. Runs against a `next dev` server on port 3100 to
 * avoid colliding with a developer's `npm run dev` on 3000. Uses a real
 * Prisma client — DATABASE_URL must be set to a disposable Postgres
 * (or SQLite via DATABASE_URL=file:./e2e.db + schema.sqlite.prisma).
 *
 * Headless by default. Browsers must be installed once:
 *   npx playwright install --with-deps chromium
 */
const PORT = Number(process.env.E2E_PORT ?? 3100)
const BASE = `http://localhost:${PORT}`

export default defineConfig({
  testDir:    './e2e',
  fullyParallel: false,                  // single dev server, serial keeps DB sane
  forbidOnly: !!process.env.CI,
  retries:    process.env.CI ? 1 : 0,
  workers:    1,
  reporter:   process.env.CI ? 'github' : 'list',
  timeout:    60_000,
  expect:     { timeout: 10_000 },

  use: {
    baseURL:    BASE,
    trace:      'on-first-retry',
    video:      'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command:           `next dev -p ${PORT}`,
    url:               BASE,
    reuseExistingServer: !process.env.CI,
    timeout:           120_000,
    env: {
      NEXTAUTH_URL:    BASE,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'e2e-secret-not-for-prod',
    },
  },
})
