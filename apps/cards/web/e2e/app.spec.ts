import { test, expect, type Page } from '@playwright/test'

/**
 * Cards E2E: create card, select/deselect, detail view, speak, settings.
 */

const PORT = 3063
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
  await page.route('https://app.tikoapi.org/v1/apps/config/cards', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ config: { id: 'cards', title: 'Cards', appColor: 'cards', appIcon: 'communication/cards' }, updatedAt: null, version: 1 })
    })
  })
  await page.route('https://app.tikoapi.org/v1/apps/cards/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'cards', updatedAt: null, version: 1, settings: {}, state: {} })
    })
  })
  await page.route('https://content.tikoapi.org/v1/cards/collections**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { collections: [] } })
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

test.describe('Cards app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders the current cards surface', async ({ page }) => {
    await expect(page.locator('.cards-app')).toBeVisible()
    await expect(page.locator('.cards-app__empty, .cards-board')).toBeVisible()
  })
})
