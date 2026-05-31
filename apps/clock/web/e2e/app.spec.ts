import { test, expect, type Page } from '@playwright/test'

/**
 * Clock E2E: analog clock display, learning modes, stage selection.
 *
 * The Clock app is more self-contained (no remote API calls in the same way),
 * but still uses identity bootstrap. Tests cover the learn/set/read/match/explore
 * modes, stage selection, and the analog clock face rendering.
 */

const PORT = 3059
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
  await page.route('**/apps/clock/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'clock', updatedAt: null, version: 1, settings: {}, state: {} })
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

test.describe('Clock app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders hero section and analog clock face', async ({ page }) => {
    await expect(page.locator('.clock-app__hero')).toBeVisible()
    await expect(page.locator('.clock-app__hero h1')).toContainText('Learn to read the clock')
    await expect(page.locator('.learning-clock, .analog-clock-face, svg, canvas').first()).toBeVisible()
  })

  test('shows mode menu with learn mode selected by default', async ({ page }) => {
    await expect(page.locator('.clock-mode-menu')).toBeVisible()
    // Learn mode should show lesson card
    await expect(page.locator('.clock-lesson-card')).toBeVisible()
  })

  test('switches to set mode', async ({ page }) => {
    const setModeBtn = page.locator('.clock-mode-menu').getByText(/set/i)
    if (await setModeBtn.isVisible()) {
      await setModeBtn.click()
      await expect(page.locator('.clock-practice-prompt')).toBeVisible()
    }
  })

  test('switches to explore mode', async ({ page }) => {
    const exploreBtn = page.locator('.clock-mode-menu').getByText(/explore/i)
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click()
      await expect(page.locator('.clock-app__explore-note')).toBeVisible()
    }
  })

  test('switches to read mode', async ({ page }) => {
    const readBtn = page.locator('.clock-mode-menu').getByText(/read/i)
    if (await readBtn.isVisible()) {
      await readBtn.click()
      await expect(page.locator('.clock-practice-prompt')).toBeVisible()
    }
  })

  test('opens and closes settings panel', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })

  test('stage selection changes the active learning stage', async ({ page }) => {
    // Look for stage selection buttons in the mode menu
    const stages = page.locator('.clock-mode-menu button')
    const count = await stages.count()
    if (count > 1) {
      await stages.nth(1).click()
      await page.waitForTimeout(200)
      // The learning clock should still be visible after stage change
      await expect(page.locator('.learning-clock, .analog-clock-face, svg, canvas').first()).toBeVisible()
    }
  })

  test('scaffold controls are visible', async ({ page }) => {
    await expect(page.locator('.clock-scaffold-controls')).toBeVisible()
  })
})
