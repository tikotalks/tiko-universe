import { test, expect, type Page } from '@playwright/test'

/**
 * Radio E2E: station creation, playback controls, settings.
 */

const PORT = 3059
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
  await page.route('https://app.tikoapi.org/v1/apps/config/radio', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ config: { id: 'radio', title: 'Radio', appColor: 'radio', appIcon: 'media/radio' }, updatedAt: null, version: 1 })
    })
  })
  await page.route('https://app.tikoapi.org/v1/apps/radio/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ app: 'radio', updatedAt: null, version: 1, settings: {}, state: {} })
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

test.describe('Radio app', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto(BASE)
  })

  test('renders the current radio surface', async ({ page }) => {
    await expect(page.locator('.radio-app')).toBeVisible()
    await expect(page.locator('.radio-app__content')).toBeVisible()
    await expect(page.locator('.radio-app__empty, .radio-app__track-grid')).toBeVisible()
  })

  test('shows the default collections with their artwork', async ({ page }) => {
    await expect(page.getByTestId('radio-collection-animals')).toBeVisible()
    await expect(page.locator('.radio-app__category-card')).toHaveCount(5)
  })

  test('the + button asks whether to add a song or a collection', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()

    await expect(page.getByTestId('radio-context-menu')).toBeVisible()
    await expect(page.getByTestId('radio-context-menu-song')).toBeVisible()
    await expect(page.getByTestId('radio-context-menu-collection')).toBeVisible()
  })

  test('adding a collection opens the collection form', async ({ page }) => {
    await page.getByTestId('tiko-header-action-add').click()
    await page.getByTestId('radio-context-menu-collection').click()

    await expect(page.getByTestId('radio-collection-form')).toBeVisible()
    await expect(page.getByTestId('radio-collection-name')).toBeVisible()
  })

  test('a shared collection can be added by its code', async ({ page }) => {
    await page.route('https://media.tikoapi.org/v1/radio/collections**', async route => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith('/K7M2Q9XR')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              code: 'K7M2Q9XR',
              name: 'Disney',
              color: 'purple',
              songCount: 1,
              featured: true,
              shareUrl: 'https://radio.tikoapps.org/?collection=K7M2Q9XR',
              songs: [{ title: 'Let It Go', source: 'youtube', youtubeVideoId: 'abcdefghijk' }],
            },
          }),
        })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    })

    await page.getByTestId('tiko-header-action-add').click()
    await page.getByTestId('radio-context-menu-scan').click()

    await page.getByTestId('radio-import-code').fill('k7m2 q9xr')
    await page.getByTestId('radio-import-find').click()

    await expect(page.getByTestId('radio-import-preview')).toContainText('Disney')
    await page.getByTestId('radio-import-confirm').click()

    await expect(page.getByTestId('radio-collection-disney')).toBeVisible()
    await expect(page.locator('.radio-app__track-card')).toContainText('Let It Go')
  })
})
