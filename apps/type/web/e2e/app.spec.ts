import { test, expect, type Page } from '@playwright/test'

/**
 * Type E2E: typing/composition area, speak/clear buttons,
 * phrases history, keyboard layout settings.
 */

const PORT = 3058
const BASE = `http://localhost:${PORT}`

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
  await page.route('https://app.tikoapi.org/v1/apps/config/type', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ config: { id: 'type', title: 'Type', appColor: 'type', appIcon: 'text/text-cursor' }, updatedAt: null, version: 1 })
    })
  })
  await page.route('https://app.tikoapi.org/v1/apps/type/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'type', updatedAt: null, version: 1, settings: {}, state: {} })
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

test.describe('Type app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders the current compose surface', async ({ page }) => {
    await expect(page.locator('.type-app')).toBeVisible()
    await expect(page.locator('.type-app__textarea')).toBeVisible()
    await expect(page.locator('.type-app__keyboard')).toBeVisible()
  })

  test('opens and closes settings panel', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()

    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })
})
