import { test, expect, type Page } from '@playwright/test'

/**
 * Radio E2E: station creation, playback controls, settings.
 */

const PORT = 3067
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
  await page.route('**/apps/radio/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'radio', updatedAt: null, version: 1, settings: {}, state: {} })
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

test.describe('Radio app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders empty state with create button', async ({ page }) => {
    await expect(page.locator('.radio-app__empty')).toBeVisible()
    await expect(page.locator('.radio-app__empty-title')).toBeVisible()
    await expect(page.getByRole('button', { name: /create/i })).toBeVisible()
  })

  test('creates a new station', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()

    await expect(page.locator('.radio-app__create')).toBeVisible()

    await page.locator('.radio-app__create textarea').first().fill('Jazz FM')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await expect(page.locator('.radio-app__station')).toHaveCount(1)
    await expect(page.locator('.radio-app__station-name').first()).toContainText('Jazz FM')
  })

  test('selecting a station shows player controls', async ({ page }) => {
    // Create a station first
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.radio-app__create textarea').first().fill('Lo-Fi Beats')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    // Click the station
    await page.locator('.radio-app__station').first().click()

    await expect(page.locator('.radio-app__player')).toBeVisible()
    await expect(page.locator('.radio-app__player-name')).toContainText('Lo-Fi Beats')
    await expect(page.locator('.radio-app__player-status')).toContainText(/playing/i)
  })

  test('pause/play toggles in player', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.radio-app__create textarea').first().fill('Rock Radio')
    await page.getByRole('button', { name: /create/i, exact: true }).click()
    await page.locator('.radio-app__station').first().click()

    // Should be playing
    await expect(page.locator('.radio-app__player-status')).toContainText(/playing/i)

    // Click pause
    await page.getByRole('button', { name: /pause/i }).click()
    await expect(page.locator('.radio-app__player-status')).toContainText(/paused/i)

    // Click play again
    await page.getByRole('button', { name: /play/i }).click()
    await expect(page.locator('.radio-app__player-status')).toContainText(/playing/i)
  })

  test('stop button deselects station', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.radio-app__create textarea').first().fill('Classical')
    await page.getByRole('button', { name: /create/i, exact: true }).click()
    await page.locator('.radio-app__station').first().click()

    await page.getByRole('button', { name: /stop/i }).click()
    await expect(page.locator('.radio-app__player')).not.toBeVisible()
  })

  test('opens and closes settings panel', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })

  test('persists stations to localStorage', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.radio-app__create textarea').first().fill('My Station')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('tiko:radio') ?? '{}')
    })
    expect(stored.stations).toHaveLength(1)
    expect(stored.stations[0].name).toBe('My Station')
  })
})
