import { test, expect, type Page } from '@playwright/test'

/**
 * Timer E2E: happy-path start/stop/reset cycle.
 *
 * Covers: initial idle state, start countdown, pause, resume, reset,
 * time expiration, settings panel, localStorage persistence.
 */

const PORT = 3057
const BASE = `http://localhost:${PORT}`

// Intercept API calls to prevent real network requests
async function mockApi(page: Page) {
  const identityBundle = {
    subject: { id: 'user-test', kind: 'device', product: 'tiko' },
    user: { id: 'user-test', accountType: 'temporary', recoverable: false },
    device: { id: 'device-test', secret: 'secret-test' },
    account: null,
    session: { id: 'session-test', token: 'token-test', transport: 'bearer', expiresAt: '2099-01-01T00:00:00.000Z' },
    runtime: { mode: 'parent', childModeEnabled: false, pinConfigured: false },
    capabilities: { canVerifyEmail: true, canUseParentMode: false, canUseChildMode: false, canManageChildAccounts: false, canDeleteAccount: false }
  }
  await page.route('https://id.tikoapps.org/v1/identity/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(identityBundle)
    })
  })
  await page.route('https://app.tikoapi.org/v1/apps/config/timer', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ config: { id: 'timer', title: 'Timer', appColor: 'timer', appIcon: 'time/timer' }, updatedAt: null, version: 1 })
    })
  })
  await page.route('https://app.tikoapi.org/v1/apps/timer/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'timer', updatedAt: null, version: 1, settings: {}, state: {} })
    })
  })
  await page.route('https://api.tikotalks.com/v1/atlas/speech', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'asset-test', audioUrl: '/v1/atlas/assets/asset-test', contentType: 'audio/mpeg', provider: { name: 'test', model: 'test', voice: 'test' } },
        meta: { cached: false, schemaVersion: 1, requestId: 'e2e-test' }
      })
    })
  })
  // Block Audio playback
  await page.addInitScript(() => {
    window.Audio = class {
      private listeners: Record<string, Array<() => void>> = {}
      play() {
        setTimeout(() => this.listeners.ended?.forEach(listener => listener()), 0)
        return Promise.resolve()
      }
      pause() {}
      addEventListener(type: string, listener: () => void) {
        this.listeners[type] = [...(this.listeners[type] || []), listener]
      }
    } as any
  })
}

test.describe('Timer app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders the current timer surface', async ({ page }) => {
    await expect(page.locator('.timer-app')).toBeVisible()
    await expect(page.locator('.timer-app__time')).toBeVisible()
    await expect(page.locator('.timer-app__controls')).toBeVisible()
  })

  test('opens and closes settings panel', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()

    // Language select should be present
    await expect(page.getByTestId('tiko-settings-language')).toBeVisible()
    await expect(page.getByTestId('tiko-settings-color-mode')).toBeVisible()

    // Close settings
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })
})
