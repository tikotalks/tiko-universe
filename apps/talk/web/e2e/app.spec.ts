import { test, expect, type Page } from '@playwright/test'

const PORT = 3066
const BASE = `http://localhost:${PORT}`

const identityBundle = {
  subject: { id: 'sub_talk_e2e', kind: 'device', product: 'tiko' },
  device: { id: 'device_talk_e2e', secret: 'device-secret' },
  session: { id: 'session_talk_e2e', token: 'session-token', transport: 'bearer', expiresAt: '2099-01-01T00:00:00.000Z' },
}

const startPayload = {
  templates: [{ id: 'want-drink', pattern: 'I want ___', category: 'drinks', slotCount: 1 }],
  initialCategories: [
    { id: 'people', label: 'People', posTypes: ['pronoun'], wordCount: 1 },
    { id: 'actions', label: 'Actions', posTypes: ['verb'], wordCount: 1 },
    { id: 'drinks', label: 'Drinks', posTypes: ['noun'], wordCount: 1 },
  ],
  initialWords: [{ id: 'i', text: 'I', pos: 'pronoun', category: 'people' }],
  savedPhrases: [{ id: 'phrase-water', sentence: 'I want water.', wordIds: ['i', 'want', 'water'], isAuto: false, usageCount: 2, label: 'Water' }],
  stripState: { words: [], validNext: ['pronoun'], canComplete: false },
}

const allWords = [
  { id: 'i', text: 'I', pos: 'pronoun', category: 'people' },
  { id: 'want', text: 'want', pos: 'verb', category: 'actions' },
  { id: 'water', text: 'water', pos: 'noun', category: 'drinks' },
]

async function mockTalkApis(page: Page) {
  await page.addInitScript(() => {
    window.Audio = class {
      constructor(public src: string) {}
      play() { return Promise.resolve() }
      pause() {}
    } as any
  })

  await page.route('https://id.tikoapps.org/v1/identity/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(identityBundle) })
  })

  await page.route('https://sentence.tikoapi.org/v1/sentence/start?*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(startPayload) })
  })

  await page.route('https://sentence.tikoapi.org/v1/sentence/vocabulary?*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ words: allWords, categories: startPayload.initialCategories, totalWords: allWords.length }),
    })
  })

  await page.route('https://sentence.tikoapi.org/v1/sentence/next', async route => {
    const body = await route.request().postDataJSON() as { currentWords: string[] }
    const suggestions = allWords.filter(word => !body.currentWords.includes(word.id)).slice(0, 2)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        suggestions,
        categories: startPayload.initialCategories,
        words: { people: [allWords[0]], actions: [allWords[1]], drinks: [allWords[2]] },
        stripState: { display: body.currentWords.join(' '), validNext: ['noun'], canComplete: body.currentWords.length > 0 },
      }),
    })
  })

  await page.route('https://sentence.tikoapi.org/v1/sentence/complete', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sentence: 'I want water.', audioUrl: 'https://media.tikocdn.org/audio/talk-e2e.mp3', audioCached: true, savedPhraseId: 'phrase-water' }),
    })
  })

  await page.route('https://sentence.tikoapi.org/v1/sentence/phrases?*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ phrases: startPayload.savedPhrases }) })
  })
}

test.describe('Talk app', () => {
  test.beforeEach(async ({ page }) => {
    await mockTalkApis(page)
    await page.goto(BASE)
  })

  test('loads the child sentence builder and completes template-to-speak flow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Build what you want to say' })).toBeVisible()
    await page.getByRole('button', { name: /I want ___/ }).click()
    await page.getByRole('button', { name: /water noun/i }).first().click()
    await expect(page.getByTestId('sentence-strip')).toContainText('water')

    await page.getByRole('button', { name: /Speak sentence/i }).click()

    await expect(page.getByRole('button', { name: /Audio ready/i })).toBeVisible()
  })

  test('keeps core controls visible and usable on a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('.talk-app')).toBeVisible()
    await expect(page.getByRole('button', { name: /Speak sentence/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /I pronoun/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /I want ___/ })).toBeVisible()
  })
})
