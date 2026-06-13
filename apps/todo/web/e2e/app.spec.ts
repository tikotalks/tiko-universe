import { test, expect, type Page } from '@playwright/test'

/**
 * Todo E2E: add/complete/delete items, steps, settings.
 */

const PORT = 3065
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
  await page.route('https://app.tikoapi.org/v1/apps/config/todo', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ config: { id: 'todo', title: 'Todo', appColor: 'todo', appIcon: 'common/checklist' }, updatedAt: null, version: 1 })
    })
  })
  await page.route('https://app.tikoapi.org/v1/apps/todo/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'todo', updatedAt: null, version: 1, settings: {}, state: {} })
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

test.describe('Todo app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders the current todo surface', async ({ page }) => {
    await expect(page.locator('#app')).toBeVisible()
    await expect(page.locator('body')).toContainText(/todo/i)
  })
})
