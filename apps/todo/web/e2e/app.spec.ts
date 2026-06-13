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

  test('renders empty state with create button', async ({ page }) => {
    await expect(page.locator('.todo-app__empty')).toBeVisible()
    await expect(page.locator('.todo-app__empty-title')).toBeVisible()
    await expect(page.getByRole('button', { name: /create/i })).toBeVisible()
  })

  test('creates a new todo item', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()

    await expect(page.locator('.todo-app__create')).toBeVisible()

    await page.locator('.todo-app__create textarea').first().fill('Buy groceries')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await expect(page.locator('.todo-app__item')).toHaveCount(1)
    await expect(page.locator('.todo-app__item-name').first()).toContainText('Buy groceries')
  })

  test('marks a todo item as complete', async ({ page }) => {
    // Create item first
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.todo-app__create textarea').first().fill('Walk the dog')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    // Mark complete
    await page.locator('.todo-app__item-check').first().click()
    await expect(page.locator('.todo-app__item').first()).toHaveClass(/done/)
  })

  test('toggles item back to incomplete', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.todo-app__create textarea').first().fill('Read a book')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    // Mark done
    await page.locator('.todo-app__item-check').first().click()
    await expect(page.locator('.todo-app__item').first()).toHaveClass(/done/)

    // Mark undone
    await page.locator('.todo-app__item-check').first().click()
    await expect(page.locator('.todo-app__item').first()).not.toHaveClass(/done/)
  })

  test('shows pending count when items exist', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.todo-app__create textarea').first().fill('Task 1')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.todo-app__create textarea').first().fill('Task 2')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await expect(page.locator('.todo-app__pending')).toContainText('2')
  })

  test('opens and closes settings panel', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })

  test('persists items to localStorage', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.todo-app__create textarea').first().fill('Stored item')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('tiko:todo') ?? '{}')
    })
    expect(stored.items).toHaveLength(1)
    expect(stored.items[0].name).toBe('Stored item')
  })
})
