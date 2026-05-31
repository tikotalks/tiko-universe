import { test, expect, type Page } from '@playwright/test'

/**
 * Todo E2E: add/complete/delete items, steps, settings.
 */

const PORT = 3065
const BASE = `http://localhost:${PORT}`

async function mockApi(page: Page) {
  await page.route('**/identity/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'user-test', kind: 'device', recoverable: false },
        device: { id: 'device-test', secret: 'secret-test' },
        session: { token: 'token-test', expiresAt: '2099-01-01T00:00:00.000Z' }
      })
    })
  })
  await page.route('**/apps/todo/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'todo', updatedAt: null, version: 1, settings: {}, state: {} })
    })
  })
  await page.route('**/generation/tts**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, audioUrl: '/audio/test.mp3' })
    })
  })
  await page.addInitScript(() => {
    window.Audio = class {
      play() { return Promise.resolve() }
      pause() {}
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
