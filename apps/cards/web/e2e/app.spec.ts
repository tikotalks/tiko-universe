import { test, expect, type Page } from '@playwright/test'

/**
 * Cards E2E: create card, select/deselect, detail view, speak, settings.
 */

const PORT = 3061
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
  await page.route('**/apps/cards/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'cards', updatedAt: null, version: 1, settings: {}, state: {} })
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
