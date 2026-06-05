import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useSentenceApi } from './useSentenceApi'
import type { Category, SavedPhrase, Template, WordTile } from '@tiko/talk-types'

const words: WordTile[] = [
  { id: 'i', text: 'I', pos: 'pronoun', category: 'people' },
  { id: 'want', text: 'want', pos: 'verb', category: 'actions' },
  { id: 'water', text: 'water', pos: 'noun', category: 'drinks' },
]

const categories: Category[] = [
  { id: 'people', label: 'People', posTypes: ['pronoun'], wordCount: 1 },
  { id: 'drinks', label: 'Drinks', posTypes: ['noun'], wordCount: 1 },
]

const templates: Template[] = [
  { id: 'want', pattern: 'I want ___', category: 'drinks', slotCount: 1 },
]

const phrases: SavedPhrase[] = [
  { id: 'phrase_water', sentence: 'I want water.', wordIds: ['i', 'want', 'water'], isAuto: false, usageCount: 3 },
]

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

describe('useSentenceApi', () => {
  it('defaults to the Sentence API domain and sends the Ankore session bearer token', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://sentence.tikoapi.org/v1/sentence/start?locale=en')
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer session-token')
      return json({ templates, initialCategories: categories, initialWords: words, savedPhrases: phrases, stripState: { words: [], validNext: ['pronoun'], canComplete: false } })
    }) as unknown as typeof fetch

    const api = useSentenceApi({ language: ref('en'), sessionToken: ref('session-token'), fetcher })

    await api.start()

    expect(api.mode.value).toBe('online')
  })

  it('uses the dev API family when loaded on a dev app hostname', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, hostname: 'dev.talk.tikoapps.org' } })

    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://dev.sentence.tikoapi.org/v1/sentence/start?locale=en')
      return json({ templates, initialCategories: categories, initialWords: words, savedPhrases: phrases, stripState: { words: [], validNext: ['pronoun'], canComplete: false } })
    }) as unknown as typeof fetch

    try {
      const api = useSentenceApi({ language: ref('en'), sessionToken: ref(''), fetcher })
      await api.start()
      expect(api.mode.value).toBe('online')
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })

  it('runs online start -> next -> complete and plays returned audio', async () => {
    const play = vi.fn(async () => {})
    const requests: string[] = []
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      requests.push(url)
      if (url.includes('/v1/sentence/start')) return json({ templates, initialCategories: categories, initialWords: words, savedPhrases: phrases, stripState: { words: [], validNext: ['pronoun'], canComplete: false } })
      if (url.includes('/v1/sentence/vocabulary')) return json({ words, categories, totalWords: words.length })
      if (url.includes('/v1/sentence/next')) return json({ suggestions: [words[2]], categories, words: { drinks: [words[2]] }, stripState: { display: 'I want', validNext: ['noun'], canComplete: true } })
      if (url.includes('/v1/sentence/complete')) return json({ sentence: 'I want water.', audioUrl: '/v1/generation/audio/1', audioCached: true, savedPhraseId: 'phrase_saved' })
      if (url.includes('/v1/sentence/phrases')) return json({ phrases })
      throw new Error(`unexpected ${url}`)
    }) as unknown as typeof fetch

    const api = useSentenceApi({ language: ref('en'), sessionToken: ref('token'), fetcher, baseUrl: 'https://sentence.test', audioFactory: () => ({ play }) })

    await api.start()
    await api.next(['i', 'want'])
    const completed = await api.complete(['i', 'want', 'water'])

    expect(api.mode.value).toBe('online')
    expect(api.templates.value).toEqual(templates)
    expect(api.suggestions.value).toEqual([words[2]])
    expect(completed).toMatchObject({ sentence: 'I want water.', audioCached: true })
    expect(play).toHaveBeenCalledOnce()
    expect(requests.some((url) => url.includes('/v1/sentence/phrases'))).toBe(true)
  })

  it('preserves API data when complete returns a TTS error', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/v1/sentence/start')) return json({ templates, initialCategories: categories, initialWords: words, savedPhrases: [], stripState: { words: [], validNext: ['pronoun'], canComplete: false } })
      if (url.includes('/v1/sentence/vocabulary')) return json({ words, categories, totalWords: words.length })
      if (url.includes('/v1/sentence/complete')) return json({ error: { code: 'tts_generation_failed', message: 'Could not generate speech audio yet.' } }, 502)
      throw new Error(`unexpected ${url}`)
    }) as unknown as typeof fetch
    const api = useSentenceApi({ language: ref('en'), sessionToken: ref(''), fetcher, baseUrl: 'https://sentence.test' })

    await api.start()
    await expect(api.complete(['i', 'want', 'water'])).rejects.toThrow('Could not generate speech audio yet.')

    expect(api.words.value).toEqual(words)
    expect(api.lastCompletion.value).toBeNull()
  })

  it('activates offline fallback when /start is unavailable', async () => {
    const fetcher = vi.fn(async () => json({ error: { message: 'offline' } }, 503)) as unknown as typeof fetch
    const api = useSentenceApi({ language: ref('en'), sessionToken: ref(''), fetcher, baseUrl: 'https://sentence.test' })

    await api.start()
    await api.next(['en-i'])
    const completed = await api.complete(['en-i', 'en-want', 'en-water'])

    expect(api.mode.value).toBe('offline')
    expect(api.words.value.length).toBeGreaterThan(0)
    expect(api.suggestions.value.some((word) => word.id === 'en-i')).toBe(false)
    expect(completed.sentence).toBe('I want water.')
  })

  it('saves and deletes manual phrases through the authenticated sentence API contract', async () => {
    const requests: Array<{ url: string, method: string, body?: unknown, authorization: string | null }> = []
    const savedPhrase: SavedPhrase = { id: 'phrase_new', sentence: 'I want water.', wordIds: ['i', 'want', 'water'], isAuto: false, usageCount: 1, label: 'Water please' }
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      requests.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        authorization: new Headers(init?.headers).get('Authorization'),
      })
      if (url.includes('/v1/sentence/phrases/phrase_new')) return json({ deleted: true })
      if (url.includes('/v1/sentence/phrases') && init?.method === 'POST') return json({ phrase: savedPhrase }, 201)
      if (url.includes('/v1/sentence/phrases')) return json({ phrases: [savedPhrase] })
      throw new Error(`unexpected ${url}`)
    }) as unknown as typeof fetch

    const api = useSentenceApi({ language: ref('en'), sessionToken: ref('session-token'), fetcher, baseUrl: 'https://sentence.test' })

    const saved = await api.savePhrase(['i', 'want', 'water'], 'Water please')
    const deleted = await api.deletePhrase('phrase_new')

    expect(saved).toEqual(savedPhrase)
    expect(deleted).toEqual({ deleted: true })
    expect(api.savedPhrases.value).toEqual([savedPhrase])
    expect(requests).toEqual([
      {
        url: 'https://sentence.test/v1/sentence/phrases',
        method: 'POST',
        body: { locale: 'en', wordIds: ['i', 'want', 'water'], label: 'Water please' },
        authorization: 'Bearer session-token',
      },
      {
        url: 'https://sentence.test/v1/sentence/phrases?locale=en',
        method: 'GET',
        body: undefined,
        authorization: 'Bearer session-token',
      },
      {
        url: 'https://sentence.test/v1/sentence/phrases/phrase_new?locale=en',
        method: 'DELETE',
        body: undefined,
        authorization: 'Bearer session-token',
      },
      {
        url: 'https://sentence.test/v1/sentence/phrases?locale=en',
        method: 'GET',
        body: undefined,
        authorization: 'Bearer session-token',
      },
    ])
  })
})
