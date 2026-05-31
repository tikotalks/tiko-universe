import { test, expect, type Page } from '@playwright/test'

/**
 * Yes-No E2E: prompt/answer cycle.
 *
 * Covers: sentence textarea, yes/no choice buttons, answer history,
 * speak button, settings panel.
 */

const PORT = 3056
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
  await page.route('**/apps/yes-no/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'yes-no', updatedAt: null, version: 1, settings: {}, state: {} })
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

test.describe('Yes-No app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders sentence textarea and choice buttons', async ({ page }) => {
    await expect(page.locator('.yes-no-app')).toBeVisible()
    await expect(page.locator('#yes-no-sentence')).toBeVisible()
    await expect(page.locator('.tiko-choice-grid')).toBeVisible()
    await expect(page.locator('.yes-no-app__speak')).toBeVisible()
  })

  test('clicking Yes records an answer', async ({ page }) => {
    const yesBtn = page.locator('.tiko-choice-grid__choice').first()
    await yesBtn.click()

    await expect(page.locator('.yes-no-app__latest')).toContainText(/yes/i)
  })

  test('clicking No records an answer', async ({ page }) => {
    const noBtn = page.locator('.tiko-choice-grid__choice').last()
    await noBtn.click()

    await expect(page.locator('.yes-no-app__latest')).toContainText(/no/i)
  })

  test('multiple answers build history', async ({ page }) => {
    const choices = page.locator('.tiko-choice-grid__choice')
    await choices.first().click()
    await choices.last().click()
    await choices.first().click()

    // Open history
    await page.getByTestId('tiko-header-action-history').click()
    const historyItems = page.locator('.yes-no-app__history li')
    await expect(historyItems).toHaveCount(3)
  })

  test('sentence textarea is editable', async ({ page }) => {
    const textarea = page.locator('#yes-no-sentence')
    await textarea.fill('Do you want pizza for dinner?')
    await expect(textarea).toHaveValue('Do you want pizza for dinner?')
  })

  test('reset button restores default sentence', async ({ page }) => {
    const textarea = page.locator('#yes-no-sentence')
    const originalValue = await textarea.inputValue()

    await textarea.fill('Custom question here')
    await page.getByRole('button', { name: /reset/i }).click()

    await expect(textarea).toHaveValue(originalValue)
  })

  test('opens and closes settings panel', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })

  test('persists state to localStorage', async ({ page }) => {
    await page.locator('.tiko-choice-grid__choice').first().click()

    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('tiko:yes-no') ?? '{}')
    })
    expect(stored.latestAnswerId).toBe('yes')
    expect(stored.answerHistory).toHaveLength(1)
  })
})
