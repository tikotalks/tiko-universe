import { test, expect, type Page } from '@playwright/test'

/**
 * Sequence E2E: create sequences, playback with next/stop, settings.
 */

const PORT = 3064
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
  await page.route('https://app.tikoapi.org/v1/apps/config/sequence', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ config: { id: 'sequence', title: 'Sequence', appColor: 'sequence', appIcon: 'common/list' }, updatedAt: null, version: 1 })
    })
  })
  await page.route('https://app.tikoapi.org/v1/apps/sequence/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'sequence', updatedAt: null, version: 1, settings: {}, state: {} })
    })
  })
  await page.route('https://content.tikoapi.org/v1/sequence/content**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { sequences: [] } })
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

test.describe('Sequence app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders empty state with create button', async ({ page }) => {
    await expect(page.locator('.sequence-app__empty')).toBeVisible()
    await expect(page.locator('.sequence-app__empty-title')).toBeVisible()
    await expect(page.getByRole('button', { name: /create/i })).toBeVisible()
  })

  test('creates a new sequence with steps', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()

    await expect(page.locator('.sequence-app__create')).toBeVisible()

    // Fill name
    await page.locator('.sequence-app__create textarea').first().fill('Morning routine')

    // First step should already have a field
    const stepTextareas = page.locator('.sequence-app__create textarea')
    await stepTextareas.nth(1).fill('Wake up')

    // Add another step
    await page.getByRole('button', { name: /add step/i }).click()
    const allStepTextareas = page.locator('.sequence-app__create textarea')
    await allStepTextareas.nth(2).fill('Brush teeth')

    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await expect(page.locator('.sequence-app__item')).toHaveCount(1)
    await expect(page.locator('.sequence-app__item-name').first()).toContainText('Morning routine')
    await expect(page.locator('.sequence-app__item-steps').first()).toContainText('2 steps')
  })

  test('playing a sequence enters playback mode', async ({ page }) => {
    // Create a sequence
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.sequence-app__create textarea').first().fill('Test sequence')
    const stepTextareas = page.locator('.sequence-app__create textarea')
    await stepTextareas.nth(1).fill('Step one')
    await page.getByRole('button', { name: /add step/i }).click()
    const allStepTextareas = page.locator('.sequence-app__create textarea')
    await allStepTextareas.nth(2).fill('Step two')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    // Click to play
    await page.locator('.sequence-app__item').first().click()

    await expect(page.locator('.sequence-app__play')).toBeVisible()
    await expect(page.locator('.sequence-app__play-name')).toContainText('Test sequence')
    await expect(page.locator('.sequence-app__play-text')).toBeVisible()
  })

  test('next step advances through the sequence', async ({ page }) => {
    // Create and play
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.sequence-app__create textarea').first().fill('Three steps')
    const stepTextareas = page.locator('.sequence-app__create textarea')
    await stepTextareas.nth(1).fill('First')
    await page.getByRole('button', { name: /add step/i }).click()
    const allStepTextareas = page.locator('.sequence-app__create textarea')
    await allStepTextareas.nth(2).fill('Second')
    await page.getByRole('button', { name: /add step/i }).click()
    const finalTextareas = page.locator('.sequence-app__create textarea')
    await finalTextareas.nth(3).fill('Third')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await page.locator('.sequence-app__item').first().click()
    await expect(page.locator('.sequence-app__play-text')).toContainText('First')

    await page.getByRole('button', { name: /next/i }).click()
    await expect(page.locator('.sequence-app__play-text')).toContainText('Second')

    await page.getByRole('button', { name: /next/i }).click()
    await expect(page.locator('.sequence-app__play-text')).toContainText('Third')
  })

  test('stop button returns to list view', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.sequence-app__create textarea').first().fill('Quick seq')
    const stepTextareas = page.locator('.sequence-app__create textarea')
    await stepTextareas.nth(1).fill('Only step')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await page.locator('.sequence-app__item').first().click()
    await expect(page.locator('.sequence-app__play')).toBeVisible()

    await page.getByRole('button', { name: /stop/i }).click()
    await expect(page.locator('.sequence-app__play')).not.toBeVisible()
  })

  test('done button on last step returns to list', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.sequence-app__create textarea').first().fill('Two step')
    const stepTextareas = page.locator('.sequence-app__create textarea')
    await stepTextareas.nth(1).fill('A')
    await page.getByRole('button', { name: /add step/i }).click()
    const allStepTextareas = page.locator('.sequence-app__create textarea')
    await allStepTextareas.nth(2).fill('B')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    await page.locator('.sequence-app__item').first().click()
    await page.getByRole('button', { name: /next/i }).click()
    // Now on last step — should show Done button
    await page.getByRole('button', { name: /done/i }).click()
    await expect(page.locator('.sequence-app__play')).not.toBeVisible()
  })

  test('opens and closes settings panel', async ({ page }) => {
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).toBeVisible()
    await page.getByTestId('tiko-header-action-settings').click()
    await expect(page.locator('.tiko-settings-panel')).not.toBeVisible()
  })

  test('cannot create sequence without steps', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.sequence-app__create textarea').first().fill('No steps')
    const submitBtn = page.getByRole('button', { name: /create/i, exact: true })
    await expect(submitBtn).toBeDisabled()
  })

  test('persists sequences to localStorage', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.locator('.sequence-app__create textarea').first().fill('Stored seq')
    const stepTextareas = page.locator('.sequence-app__create textarea')
    await stepTextareas.nth(1).fill('Step A')
    await page.getByRole('button', { name: /create/i, exact: true }).click()

    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('tiko:sequence') ?? '{}')
    })
    expect(stored.items).toHaveLength(1)
    expect(stored.items[0].name).toBe('Stored seq')
    expect(stored.items[0].steps).toEqual(['Step A'])
  })
})
