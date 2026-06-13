import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useCardsStore } from './useCardsStore'
import type { CardCollection, PersistedCards } from '../types'

function createStore(collections: CardCollection[], fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock)
  const persisted: PersistedCards[] = []
  const store = useCardsStore({
    storageKey: 'test',
    sessionToken: ref('session-token'),
    readStored: () => ({
      collections,
      collectionStack: ['user_source'],
    }),
    writeStored: state => {
      persisted.push(state)
    },
  })
  store.selectedCardIDs.value = new Set(['user_card'])
  return { store, persisted }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const sourceCollection: CardCollection = {
  id: 'user_source',
  title: 'Source',
  color: 'blue',
  order: 0,
  mediaCategories: [],
  cards: [
    {
      id: 'user_card',
      title: 'Water',
      speech: 'Water',
      color: 'blue',
      order: 0,
    },
    {
      id: 'user_card_2',
      title: 'Food',
      speech: 'Food',
      color: 'green',
      order: 1,
    },
    {
      id: 'user_card_3',
      title: 'Sleep',
      speech: 'Sleep',
      color: 'purple',
      order: 2,
    },
  ],
}

const targetCollection: CardCollection = {
  id: 'user_target',
  title: 'Target',
  color: 'green',
  order: 1,
  mediaCategories: [],
  cards: [],
}

describe('useCardsStore moveSelected', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('copies a user card before deleting it from the source collection', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        return jsonResponse({ success: true, data: body }, 201)
      }
      if (init?.method === 'DELETE') return jsonResponse({ success: true })
      return jsonResponse({ success: false }, 404)
    })
    const { store } = createStore([
      structuredClone(sourceCollection),
      structuredClone(targetCollection),
    ], fetchMock)

    await store.moveSelected('user_target')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://content.tikoapi.org/v1/cards/collections/user_target/cards',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://content.tikoapi.org/v1/cards/collections/user_source/cards/user_card',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(store.collections.value.find(collection => collection.id === 'user_source')?.cards).toEqual([
      expect.objectContaining({ id: 'user_card_2', title: 'Food' }),
      expect.objectContaining({ id: 'user_card_3', title: 'Sleep' }),
    ])
    expect(store.collections.value.find(collection => collection.id === 'user_target')?.cards).toEqual([
      expect.objectContaining({ id: 'user_card', title: 'Water' }),
    ])
  })

  it('keeps the source card when the target copy fails', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: false }, 500))
    const { store } = createStore([
      structuredClone(sourceCollection),
      structuredClone(targetCollection),
    ], fetchMock)

    await store.moveSelected('user_target')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.collections.value.find(collection => collection.id === 'user_source')?.cards).toEqual([
      expect.objectContaining({ id: 'user_card', title: 'Water' }),
      expect.objectContaining({ id: 'user_card_2', title: 'Food' }),
      expect.objectContaining({ id: 'user_card_3', title: 'Sleep' }),
    ])
    expect(store.collections.value.find(collection => collection.id === 'user_target')?.cards).toEqual([])
  })

  it('deletes selected cards from the active collection and persists the result', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return jsonResponse({ success: true })
      return jsonResponse({ success: false }, 404)
    })
    const { store, persisted } = createStore([
      structuredClone(sourceCollection),
      structuredClone(targetCollection),
    ], fetchMock)
    store.selectedCardIDs.value = new Set(['user_card', 'user_card_3'])

    await store.deleteSelected()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://content.tikoapi.org/v1/cards/collections/user_source/cards/user_card',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'https://content.tikoapi.org/v1/cards/collections/user_source/cards/user_card_3',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(store.collections.value.find(collection => collection.id === 'user_source')?.cards).toEqual([
      expect.objectContaining({ id: 'user_card_2', title: 'Food' }),
    ])
    expect(store.selectedCardIDs.value.size).toBe(0)
    expect(persisted.at(-1)?.collections?.find(collection => collection.id === 'user_source')?.cards).toEqual([
      expect.objectContaining({ id: 'user_card_2', title: 'Food' }),
    ])
  })

  it('reorders cards through drag/drop and persists stable order values', () => {
    const fetchMock = vi.fn()
    const { store, persisted } = createStore([
      structuredClone(sourceCollection),
      structuredClone(targetCollection),
    ], fetchMock)
    const items = store.gridItems(false)
    const dragged = items.find(item => item.kind === 'card' && item.card.id === 'user_card_3')
    const target = items.find(item => item.kind === 'card' && item.card.id === 'user_card')
    if (!dragged || !target) throw new Error('Expected card grid items')

    store.onDragStart(dragged)
    store.onDropItem(target)

    const cards = store.collections.value.find(collection => collection.id === 'user_source')?.cards ?? []
    expect(cards.map(card => card.id)).toEqual(['user_card_3', 'user_card', 'user_card_2'])
    expect(cards.map(card => card.order)).toEqual([0, 1, 2])
    expect(persisted.at(-1)?.collections?.find(collection => collection.id === 'user_source')?.cards.map(card => card.id)).toEqual([
      'user_card_3',
      'user_card',
      'user_card_2',
    ])
  })
})
