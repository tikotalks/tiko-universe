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

  test('renders empty state with create button', async ({ page }) => {
    await expect(page.locator('.cards-app__empty')).toBeVisible()
    await expect(page.locator('.cards-app__empty-title')).toBeVisible()
    await expect(page.getByRole('button', { name: /create/i })).toBeVisible()
  })

  test('creates a new card', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()

    await expect(page.locator('.cards-app__create')).toBeVisible()

    await page.locator('.cards-app__create textarea').first().fill('Apple')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await expect(page.locator('.cards-app__card')).toHaveCount(1)
    await expect(page.locator('.cards-app__card-name').first()).toContainText('Apple')
  })

  test('selecting a card shows detail view', async ({ page }) => {
    // Create cards
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.cards-app__create textarea').first().fill('Cat')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    // Click card
    await page.locator('.cards-app__card').first().click()

    await expect(page.locator('.cards-app__detail')).toBeVisible()
    await expect(page.locator('.cards-app__detail-name')).toContainText('Cat')
    await expect(page.getByRole('button', { name: /speak/i })).toBeVisible()
  })

  test('back button returns to grid view', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.cards-app__create textarea').first().fill('Dog')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await page.locator('.cards-app__card').first().click()
    await expect(page.locator('.cards-app__detail')).toBeVisible()

    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.locator('.cards-app__grid')).toBeVisible()
  })

  test('creates multiple cards and shows grid', async ({ page }) => {
    for (const name of ['Red', 'Blue', 'Green']) {
      await page.getByTestId('tiko-header-action-add').click()
      await page.locator('.cards-app__create textarea').first().fill(name)
      await page.getByRole('button', { name: /create/i, exact: true }).click()
    }

    await expect(page.locator('.cards-app__card')).toHaveCount(3)
  })

  test('opens and closes settings panel', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })

  test('cannot create card with empty name', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    const submitBtn = page.getByRole('button', { name: /create/i, exact: true })
    await expect(submitBtn).toBeDisabled()
  })

  test('persists cards to localStorage', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.cards-app__create textarea').first().fill('Persistent Card')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('tiko:cards') ?? '{}')
    })
    expect(stored.items).toHaveLength(1)
    expect(stored.items[0].name).toBe('Persistent Card')
  })
})
