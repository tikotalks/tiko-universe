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
  await page.route('**/apps/timer/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'timer', updatedAt: null, version: 1, settings: {}, state: {} })
    })
  })
  await page.route('**/generation/tts**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, audioUrl: '/audio/test.mp3' })
    })
  })
  // Block Audio playback
  await page.addInitScript(() => {
    window.Audio = class {
      play() { return Promise.resolve() }
      pause() {}
    } as any
  })
}

test.describe('Timer app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders timer display with default 05:00', async ({ page }) => {
    await expect(page.locator('.timer-app__time')).toHaveText('05:00')
    await expect(page.locator('.timer-app')).toBeVisible()
    await expect(page.locator('.timer-app__field-input').first()).toBeVisible()
  })

  test('starts countdown and shows Running status', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /start/i })
    await expect(startBtn).toBeVisible()
    await startBtn.click()

    await expect(page.locator('.timer-app__time')).toHaveText('05:00')
    await expect(page.locator('.timer-app__status')).toHaveText(/running/i)
  })

  test('pauses countdown and shows Paused status', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click()
    await page.waitForTimeout(500)

    const pauseBtn = page.getByRole('button', { name: /pause/i })
    await expect(pauseBtn).toBeVisible()
    await pauseBtn.click()

    await expect(page.locator('.timer-app__status')).toHaveText(/paused/i)
  })

  test('resumes after pause', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /pause/i }).click()

    const resumeBtn = page.getByRole('button', { name: /resume/i })
    await expect(resumeBtn).toBeVisible()
    await resumeBtn.click()

    await expect(page.locator('.timer-app__status')).toHaveText(/running/i)
  })

  test('resets to initial time', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /pause/i }).click()

    const resetBtn = page.getByRole('button', { name: /reset/i })
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()

    await expect(page.locator('.timer-app__time')).toHaveText('05:00')
    await expect(page.locator('.timer-app__status')).toHaveText(/ready|idle/i)
  })

  test('shows expired state when timer reaches zero', async ({ page }) => {
    // Set a very short timer
    const inputs = page.locator('.timer-app__field-input')
    await inputs.first().fill('0')
    await inputs.last().fill('1')

    await page.getByRole('button', { name: /start/i }).click()
    await expect(page.locator('.timer-app__time')).toHaveText('00:01')

    // Wait for expiry
    await page.waitForTimeout(1500)
    await expect(page.locator('.timer-app__time')).toHaveText('00:00')
    await expect(page.locator('.timer-app__time')).toHaveClass(/expired/)
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

  test('persists state to localStorage', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click()
    await page.waitForTimeout(500)

    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('tiko:timer') ?? '{}')
    })
    expect(stored.isRunning).toBe(true)
    expect(stored.targetTimestamp).toBeTruthy()
  })
})
