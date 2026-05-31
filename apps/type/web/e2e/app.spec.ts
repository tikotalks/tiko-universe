import { test, expect, type Page } from '@playwright/test'

/**
 * Type E2E: typing/composition area, speak/clear buttons,
 * phrases history, keyboard layout settings.
 */

const PORT = 3058
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
  await page.route('**/apps/type/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'type', updatedAt: null, version: 1, settings: {}, state: {} })
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

test.describe('Type app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders compose area with textarea and action buttons', async ({ page }) => {
    await expect(page.locator('.type-app')).toBeVisible()
    await expect(page.locator('#type-compose')).toBeVisible()
    await expect(page.locator('.type-app__speak')).toBeVisible()
    await expect(page.locator('.type-app__clear')).toBeVisible()
  })

  test('can type text in the compose area', async ({ page }) => {
    const textarea = page.locator('#type-compose')
    await textarea.fill('Hello world')
    await expect(textarea).toHaveValue('Hello world')
  })

  test('clear button empties the textarea', async ({ page }) => {
    const textarea = page.locator('#type-compose')
    await textarea.fill('Some text')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(textarea).toHaveValue('')
  })

  test('speak button is disabled when textarea is empty', async ({ page }) => {
    await expect(page.locator('.type-app__speak')).toBeDisabled()
  })

  test('speak button is enabled after typing', async ({ page }) => {
    await page.locator('#type-compose').fill('Test text')
    await expect(page.locator('.type-app__speak')).toBeEnabled()
  })

  test('opens phrases history panel', async ({ page }) => {
    await page.locator('#type-compose').fill('First phrase')
    await page.getByRole('button', { name: /speak/i, exact: true }).click()

    await page.getByTestId('tiko-header-action-phrases').click()
    await expect(page.locator('.type-app__phrases')).toBeVisible()
    await expect(page.locator('.type-app__phrases-list li')).toHaveCount(1)
  })

  test('opens and closes settings panel with keyboard layout option', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()
    await expect(page.locator('[data-test="tiko-settings-keyboard-layout"]')).toBeVisible()

    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })

  test('persists text to localStorage', async ({ page }) => {
    await page.locator('#type-compose').fill('Saved text')
    await page.waitForTimeout(300)

    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('tiko:type') ?? '{}')
    })
    expect(stored.text).toBe('Saved text')
  })
})
