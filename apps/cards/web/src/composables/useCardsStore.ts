import { computed, ref, type Ref } from 'vue'
import { useTikoMedia } from '@tiko/media'
import type { TikoColorName } from '@tiko/data'
import { tikoColors, tikoContentImageRefUrl } from '@tiko/ui'
import type { CardCollection, CardsCardInput, CardsCollectionInput, CardsGridItem, CommunicationCard, PersistedCards } from '../types'
import { createCardsApi, resolveContentBaseUrl } from './cardsApi'
import { matchCardsMedia } from './cardsMedia'

const colorNames = new Set<TikoColorName>(tikoColors.map(color => color.name as TikoColorName))
const colorValueByName = new Map<TikoColorName, string>(tikoColors.map(color => [color.name as TikoColorName, color.hex]))
const fallbackColors = ['red', 'yellow', 'green', 'blue', 'orange', 'purple'] as const

export interface UseCardsStoreOptions {
  storageKey: string
  sessionToken: Ref<string | undefined>
  readStored: () => PersistedCards
  writeStored: (state: PersistedCards) => void
}

export function useCardsStore(options: UseCardsStoreOptions) {
  const stored = options.readStored()
  const api = createCardsApi({ baseUrl: resolveContentBaseUrl(), getSessionToken: () => options.sessionToken.value ?? '' })
  const { fetchByCategory } = useTikoMedia()

  const collections = ref<CardCollection[]>(stored.collections ?? [])
  const collectionStack = ref<string[]>(stored.collectionStack ?? [])
  const loadingCollections = ref(true)
  const loadingMediaIDs = ref<Set<string>>(new Set())
  const fetchedMediaIDs = ref<Set<string>>(new Set())
  const collectionThumbnails = ref<Record<string, string>>({})
  const cardImages = ref<Record<string, string>>({})
  const editMode = ref(false)
  const selectedCollectionIDs = ref<Set<string>>(new Set())
  const selectedCardIDs = ref<Set<string>>(new Set())
  const draggingID = ref('')

  const currentCollection = computed(() => {
    const id = collectionStack.value.at(-1)
    return id ? collections.value.find(collection => collection.id === id) ?? null : null
  })

  function visibleCollections(hideDefaults: boolean) {
    const source = hideDefaults ? collections.value.filter(collection => isUserOwned(collection.id)) : collections.value
    return [...source].sort((a, b) => a.order - b.order)
  }

  function rootCollections(hideDefaults: boolean) {
    return visibleCollections(hideDefaults).filter(collection => !collection.parentID)
  }

  function childCollections(hideDefaults: boolean) {
    const parentID = currentCollection.value?.id
    return parentID ? visibleCollections(hideDefaults).filter(collection => collection.parentID === parentID) : []
  }

  function gridItems(hideDefaults: boolean): CardsGridItem[] {
    if (!currentCollection.value) {
      return rootCollections(hideDefaults).map(collection => ({ id: `collection-${collection.id}`, kind: 'collection', collection }))
    }
    return [
      ...childCollections(hideDefaults).map(collection => ({ id: `collection-${collection.id}`, kind: 'collection' as const, collection })),
      ...currentCollection.value.cards.map(card => ({ id: `card-${card.id}`, kind: 'card' as const, card, collectionID: currentCollection.value!.id })),
    ]
  }

  function persist(extra: Partial<PersistedCards> = {}) {
    options.writeStored({
      ...stored,
      ...extra,
      collections: collections.value.map(collectionForStorage),
      collectionStack: collectionStack.value,
    })
  }

  async function loadCollections(language?: string) {
    loadingCollections.value = true
    try {
      collections.value = (await api.fetchCollections(language)).map(normalizeCollection).sort((a, b) => a.order - b.order)
    } catch {
      if (!collections.value.length) collections.value = []
    } finally {
      loadingCollections.value = false
      persist()
    }
  }

  function replaceCollection(updated: CardCollection) {
    const normalized = normalizeCollection(updated)
    const index = collections.value.findIndex(collection => collection.id === normalized.id)
    collections.value = index >= 0
      ? collections.value.map(collection => collection.id === normalized.id ? normalized : collection)
      : [...collections.value, normalized]
  }

  async function createCollection(input: CardsCollectionInput) {
    const title = input.title.trim()
    if (!title) return
    const id = createUserID()
    const optimistic: CardCollection = {
      id,
      title,
      color: input.color,
      order: collections.value.filter(collection => (collection.parentID ?? '') === (input.parentID ?? '')).length,
      parentID: input.parentID ?? null,
      mediaCategories: [],
      imageRef: input.imageRef,
      cards: [],
    }
    replaceCollection(optimistic)
    try {
      const saved = await api.createCollection({ ...input, id, order: optimistic.order, title })
      if (saved) replaceCollection(saved)
    } finally {
      persist()
    }
  }

  async function updateCollection(id: string, input: CardsCollectionInput) {
    const current = collections.value.find(collection => collection.id === id)
    if (!current) return
    replaceCollection({
      ...current,
      ...input,
      title: input.title.trim() || current.title,
    })
    try {
      const saved = await api.updateCollection(id, { ...input, title: input.title.trim() || current.title })
      if (saved) replaceCollection(saved)
    } finally {
      persist()
    }
  }

  async function deleteCollection(id: string) {
    collections.value = collections.value.filter(collection => collection.id !== id && collection.parentID !== id)
    try {
      await api.deleteCollection(id)
    } finally {
      persist()
    }
  }

  async function createCard(collectionID: string, input: CardsCardInput) {
    const title = input.title.trim()
    if (!title) return
    const collection = collections.value.find(item => item.id === collectionID)
    if (!collection) return
    const optimistic: CommunicationCard = {
      id: createUserID(),
      title,
      speech: input.speech.trim() || title,
      color: input.color,
      order: collection.cards.length,
      imageRef: input.imageRef,
    }
    collection.cards = [...collection.cards, optimistic]
    collections.value = [...collections.value]
    try {
      const saved = await api.createCard(collectionID, { ...optimistic, order: optimistic.order ?? collection.cards.length })
      if (saved) {
        collection.cards = collection.cards.map(card => card.id === optimistic.id ? saved : card)
        collections.value = [...collections.value]
      }
    } finally {
      persist()
    }
  }

  async function updateCard(collectionID: string, cardID: string, input: CardsCardInput) {
    const collection = collections.value.find(item => item.id === collectionID)
    if (!collection) return
    collection.cards = collection.cards.map(card => card.id === cardID
      ? {
          ...card,
          ...input,
          title: input.title.trim() || card.title,
        }
      : card)
    collections.value = [...collections.value]
    try {
      const saved = await api.updateCard(collectionID, cardID, input)
      if (saved) {
        collection.cards = collection.cards.map(card => card.id === cardID ? saved : card)
        collections.value = [...collections.value]
      }
    } finally {
      persist()
    }
  }

  async function deleteCard(collectionID: string, cardID: string) {
    const collection = collections.value.find(item => item.id === collectionID)
    if (!collection) return
    collection.cards = collection.cards.filter(card => card.id !== cardID)
    collections.value = [...collections.value]
    try {
      await api.deleteCard(collectionID, cardID)
    } finally {
      persist()
    }
  }

  async function hydrateMedia(collectionID: string, prefetchCards = true) {
    const collection = collections.value.find(item => item.id === collectionID)
    if (!collection?.mediaCategories.length || fetchedMediaIDs.value.has(collectionID)) return
    fetchedMediaIDs.value.add(collectionID)
    loadingMediaIDs.value = new Set([...loadingMediaIDs.value, collectionID])
    try {
      const mediaItems = await fetchByCategory(collection.mediaCategories, { limit: 100 })
      const match = matchCardsMedia(collection, mediaItems, api.baseUrl)
      cardImages.value = { ...cardImages.value, ...match.cardImages }
      if (match.thumbnailURL) collectionThumbnails.value = { ...collectionThumbnails.value, [collectionID]: match.thumbnailURL }
      if (prefetchCards) {
        for (const card of collection.cards.slice(0, 12)) {
          const url = card.imageRef ? tikoContentImageRefUrl(card.imageRef, api.baseUrl) : match.cardImages[card.id]
          if (url) void preload(url)
        }
      }
      collections.value = [...collections.value]
    } catch {
      const nextFetched = new Set(fetchedMediaIDs.value)
      nextFetched.delete(collectionID)
      fetchedMediaIDs.value = nextFetched
    } finally {
      const next = new Set(loadingMediaIDs.value)
      next.delete(collectionID)
      loadingMediaIDs.value = next
    }
  }

  function navigateTo(collection: CardCollection) {
    if (editMode.value) return
    collectionStack.value = [...collectionStack.value, collection.id]
    void hydrateMedia(collection.id)
    persist()
  }

  function navigateBack() {
    if (editMode.value) {
      clearEditMode()
      return
    }
    collectionStack.value = collectionStack.value.slice(0, -1)
    persist()
  }

  function goHome() {
    collectionStack.value = []
    persist()
  }

  function startEditMode() {
    editMode.value = true
  }

  function clearEditMode() {
    editMode.value = false
    selectedCollectionIDs.value = new Set()
    selectedCardIDs.value = new Set()
  }

  function toggleSelection(item: CardsGridItem) {
    if (item.kind === 'collection') {
      const next = new Set(selectedCollectionIDs.value)
      if (next.has(item.collection.id)) {
        next.delete(item.collection.id)
      } else {
        next.add(item.collection.id)
      }
      selectedCollectionIDs.value = next
      return
    }
    const next = new Set(selectedCardIDs.value)
    if (next.has(item.card.id)) {
      next.delete(item.card.id)
    } else {
      next.add(item.card.id)
    }
    selectedCardIDs.value = next
  }

  function isSelected(item: CardsGridItem) {
    return item.kind === 'collection' ? selectedCollectionIDs.value.has(item.collection.id) : selectedCardIDs.value.has(item.card.id)
  }

  async function deleteSelected() {
    for (const id of selectedCollectionIDs.value) await deleteCollection(id)
    if (currentCollection.value) {
      for (const id of selectedCardIDs.value) await deleteCard(currentCollection.value.id, id)
    }
    clearEditMode()
  }

  async function moveSelected(targetCollectionID: string) {
    for (const id of selectedCollectionIDs.value) {
      const collection = collections.value.find(item => item.id === id)
      if (collection && isUserOwned(collection.id)) await updateCollection(id, { ...collection, parentID: targetCollectionID })
    }
    if (currentCollection.value) {
      const source = currentCollection.value
      const target = collections.value.find(item => item.id === targetCollectionID)
      if (!target || source.id === target.id) {
        clearEditMode()
        return
      }
      for (const id of selectedCardIDs.value) {
        const card = source.cards.find(item => item.id === id)
        if (!card || !isUserOwned(card.id)) continue
        const order = target.cards.length
        try {
          const saved = await api.createCard(targetCollectionID, { ...card, id: card.id, order })
          if (!saved) continue
          await api.deleteCard(source.id, id)
          source.cards = source.cards.filter(item => item.id !== id)
          target.cards = [...target.cards, { ...saved, order }]
          collections.value = [...collections.value]
          persist()
        } catch {
          // Keep the source card intact when copying or deleting fails.
        }
      }
    }
    clearEditMode()
  }

  async function recolorSelected(color: TikoColorName) {
    if (!currentCollection.value) return
    for (const id of selectedCardIDs.value) {
      const card = currentCollection.value.cards.find(item => item.id === id)
      if (card) await updateCard(currentCollection.value.id, id, { ...card, color })
    }
    clearEditMode()
  }

  function reorderCollections(sourceID: string, targetID: string) {
    if (sourceID === targetID) return
    const source = collections.value.find(item => item.id === sourceID)
    const target = collections.value.find(item => item.id === targetID)
    if (!source || !target) return
    const siblings = collections.value.filter(item => (item.parentID ?? '') === (target.parentID ?? '')).sort((a, b) => a.order - b.order)
    const ordered = siblings.filter(item => item.id !== sourceID)
    const targetIndex = ordered.findIndex(item => item.id === targetID)
    ordered.splice(targetIndex, 0, source)
    const orderMap = new Map(ordered.map((item, index) => [item.id, index]))
    collections.value = collections.value.map(item => orderMap.has(item.id) ? { ...item, parentID: target.parentID, order: orderMap.get(item.id)! } : item)
    persist()
  }

  function reorderCards(collectionID: string, sourceID: string, targetID: string) {
    if (sourceID === targetID) return
    const collection = collections.value.find(item => item.id === collectionID)
    if (!collection) return
    const source = collection.cards.find(card => card.id === sourceID)
    if (!source) return
    const cards = collection.cards.filter(card => card.id !== sourceID)
    const targetIndex = cards.findIndex(card => card.id === targetID)
    cards.splice(targetIndex, 0, source)
    collection.cards = cards.map((card, order) => ({ ...card, order }))
    collections.value = [...collections.value]
    persist()
  }

  function onDragStart(item: CardsGridItem) {
    draggingID.value = item.kind === 'collection' ? item.collection.id : item.card.id
  }

  function onDropItem(target: CardsGridItem) {
    const sourceID = draggingID.value
    draggingID.value = ''
    if (!sourceID) return
    if (target.kind === 'collection') reorderCollections(sourceID, target.collection.id)
    if (target.kind === 'card' && currentCollection.value) reorderCards(currentCollection.value.id, sourceID, target.card.id)
  }

  return {
    contentBaseUrl: api.baseUrl,
    collections,
    collectionStack,
    currentCollection,
    loadingCollections,
    loadingMediaIDs,
    collectionThumbnails,
    cardImages,
    editMode,
    selectedCollectionIDs,
    selectedCardIDs,
    selectedCount: computed(() => selectedCollectionIDs.value.size + selectedCardIDs.value.size),
    visibleCollections,
    rootCollections,
    childCollections,
    gridItems,
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    createCard,
    updateCard,
    deleteCard,
    hydrateMedia,
    navigateTo,
    navigateBack,
    goHome,
    startEditMode,
    clearEditMode,
    toggleSelection,
    isSelected,
    deleteSelected,
    moveSelected,
    recolorSelected,
    onDragStart,
    onDropItem,
    persist,
  }
}

export function normalizeCollection(collection: CardCollection): CardCollection {
  const collectionColor = normalizeColor(collection.color, 'orange')
  return {
    ...collection,
    color: collectionColor,
    parentID: collection.parentID ?? null,
    mediaCategories: Array.isArray(collection.mediaCategories) ? collection.mediaCategories : [],
    cards: (collection.cards ?? []).map((card, index) => ({
      ...card,
      speech: card.speech || card.title,
      color: normalizeColor(card.color, collectionColor),
      order: card.order ?? index,
    })),
  }
}

export function isUserOwned(id: string) {
  return id.startsWith('user_')
}

export function colorValue(color: TikoColorName) {
  return colorValueByName.get(color) ?? colorValueByName.get('gray') ?? 'currentColor'
}

function normalizeColor(value: unknown, fallback: TikoColorName): TikoColorName {
  if (typeof value === 'string') {
    if (colorNames.has(value as TikoColorName)) return value as TikoColorName
  }
  return fallback
}

export function fallbackColor(index: number): TikoColorName {
  return fallbackColors[index % fallbackColors.length]
}

function collectionForStorage(collection: CardCollection): CardCollection {
  return collection
}

function createUserID() {
  return `user_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`
}

function preload(url: string) {
  return new Promise<void>(resolve => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = url
  })
}
