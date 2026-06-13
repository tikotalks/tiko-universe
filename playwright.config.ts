import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Tiko Universe monorepo E2E tests.
 *
 * Each app runs its own dev server on a dedicated port.
 * Tests mock the identity and data API endpoints so no live backend is needed.
 *
 * Run all E2E tests:  npx playwright test --config=playwright.config.ts
 * Run a single app:   npx playwright test --project=timer
 */

const apps = [
  { name: 'yes-no',   cwd: 'apps/yes-no/web',   port: 3056 },
  { name: 'timer',    cwd: 'apps/timer/web',    port: 3057 },
  { name: 'type',     cwd: 'apps/type/web',     port: 3058 },
  { name: 'radio',    cwd: 'apps/radio/web',    port: 3059 },
  { name: 'cards',    cwd: 'apps/cards/web',    port: 3063 },
  { name: 'sequence', cwd: 'apps/sequence/web', port: 3064 },
  { name: 'todo',     cwd: 'apps/todo/web',     port: 3065 },
]

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  expect: { timeout: 20_000 },
  use: {
    testIdAttribute: 'data-test',
  },
  webServer: apps.map(app => ({
    command: 'npm run dev',
    cwd: app.cwd,
    port: app.port,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  })),
  projects: apps.map(app => ({
    name: app.name,
    testDir: `${app.cwd}/e2e`,
    testMatch: '**/*.spec.ts',
    use: {
      baseURL: `http://localhost:${app.port}`,
    },
  })),
})
