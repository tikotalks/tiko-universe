import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useYesNoStore } from './useYesNoStore'
import type { AnswerSet, PersistedYesNo } from '../types'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function createStore(initialSets: AnswerSet[] = [], fetchMock: ReturnType<typeof vi.fn> = vi.fn()) {
  vi.stubGlobal('fetch', fetchMock)
  const persisted: PersistedYesNo[] = []
  const store = useYesNoStore({
    storageKey: 'test',
    sessionToken: ref('session-token'),
    readStored: () => ({ answerSets: initialSets }),
    writeStored: state => { persisted.push(state) },
  })
  return { store, persisted }
}

describe('useYesNoStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a new answer set optimistically and persists it via content-api', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.endsWith('/yes-no/answer-sets')) {
        const body = JSON.parse(String(init.body))
        return jsonResponse({ success: true, data: { ...body, answers: [] } }, 201)
      }
      return jsonResponse({ success: false }, 404)
    })
    const { store, persisted } = createStore([], fetchMock)

    await store.createSet({ title: 'My answers', color: 'green' })

    expect(store.answerSets.value).toHaveLength(1)
    expect(store.answerSets.value[0].title).toBe('My answers')
    expect(store.answerSets.value[0].id.startsWith('user_')).toBe(true)
    expect(store.selectedSetId.value).toBe(store.answerSets.value[0].id)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/yes-no/answer-sets'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(persisted.length).toBeGreaterThan(0)
    expect(persisted.at(-1)?.answerSets).toHaveLength(1)
  })

  it('creates a tile inside a set optimistically and syncs via content-api', async () => {
    const existingSet: AnswerSet = {
      id: 'user_existing',
      title: 'Existing',
      color: 'teal',
      order: 0,
      answers: [],
    }
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/tiles')) {
        const body = JSON.parse(String(init.body))
        return jsonResponse({ success: true, data: body }, 201)
      }
      return jsonResponse({ success: false }, 404)
    })
    const { store } = createStore([existingSet], fetchMock)

    await store.createTile('user_existing', { label: 'Help', speech: 'Help', color: 'blue' })

    expect(store.answerSets.value[0].answers).toHaveLength(1)
    expect(store.answerSets.value[0].answers[0].label).toBe('Help')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/yes-no/answer-sets/user_existing/tiles'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('selects a set and persists the selection locally', async () => {
    const setA: AnswerSet = { id: 'user_a', title: 'A', color: 'green', order: 0, answers: [] }
    const setB: AnswerSet = { id: 'user_b', title: 'B', color: 'blue', order: 1, answers: [] }
    const { store, persisted } = createStore([setA, setB], vi.fn())

    store.selectSet('user_b')

    expect(store.selectedSetId.value).toBe('user_b')
    expect(store.selectedSet.value?.id).toBe('user_b')
    expect(persisted.at(-1)?.selectedSetId).toBe('user_b')
  })

  it('deletes a user-owned set and clears selection when it was active', async () => {
    const setA: AnswerSet = { id: 'user_a', title: 'A', color: 'green', order: 0, answers: [] }
    const setB: AnswerSet = { id: 'user_b', title: 'B', color: 'blue', order: 1, answers: [] }
    const fetchMock = vi.fn(async () => jsonResponse({ success: true }))
    const { store } = createStore([setA, setB], fetchMock)
    store.selectSet('user_a')

    await store.deleteSet('user_a')

    expect(store.answerSets.value).toHaveLength(1)
    expect(store.answerSets.value[0].id).toBe('user_b')
    expect(store.selectedSetId.value).toBe('user_b')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/yes-no/answer-sets/user_a'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('loads answer sets from content-api and selects the returned selected set', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/yes-no/content')) {
        return jsonResponse({
          success: true,
          data: {
            answerSets: [
              { id: 'user_a', title: 'A', color: 'green', order: 0, answers: [] },
              { id: 'user_b', title: 'B', color: 'blue', order: 1, answers: [] },
            ],
            selectedSetId: 'user_b',
          },
        })
      }
      return jsonResponse({ success: false }, 404)
    })
    const { store } = createStore([], fetchMock)

    await store.loadContent('en')

    expect(store.answerSets.value).toHaveLength(2)
    expect(store.selectedSetId.value).toBe('user_b')
  })

  it('synthesizes a default set from a legacy flat-answers payload', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/yes-no/content')) {
        return jsonResponse({
          success: true,
          data: {
            answers: [
              { id: 'yes', label: 'Yes', speech: 'Yes', color: 'green', imageRef: 'media-yes' },
              { id: 'no', label: 'No', speech: 'No', color: 'red' },
            ],
          },
        })
      }
      return jsonResponse({ success: false }, 404)
    })
    const { store } = createStore([], fetchMock)

    await store.loadContent('en')

    expect(store.answerSets.value).toHaveLength(1)
    expect(store.answerSets.value[0].id).toBe('default')
    expect(store.answerSets.value[0].answers).toHaveLength(2)
    expect(store.answerSets.value[0].answers[0].imageRef).toBe('media-yes')
  })
})
