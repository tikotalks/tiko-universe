<script setup lang="ts">
import { computed, h, inject, markRaw, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Button, Popup, ContextMenu, type ContextMenuItem, type PopupService } from '@sil/ui'
import { IdentityClient } from '@tiko/identity'
import { TikoDataClient, type CardsSettings, type CardsState, type CardsCollection, type CardsTile } from '@tiko/data'
import { useTikoMedia, type TikoMedia } from '@tiko/media'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  useIdentityRuntime,
  type IdentityRuntimeState,
  createTikoTtsClient,
  type TikoColorMode
} from '@tiko/ui'
import { appConfig } from './appConfig'
import './styles.scss'

// ---------------------------------------------------------------------------
// popupService (provided in main.ts)
// ---------------------------------------------------------------------------
const popup = inject<PopupService>('popupService')!

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const storageKey = 'tiko:cards'
const appId = 'cards' as const
const apiBaseUrl = resolveApiBaseUrl()
const identityBaseUrl = resolveIdentityBaseUrl()

type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  collections?: CardsCollection[]
  navPath?: string[]
  hiddenDefaults?: string[]
  collectionOverrides?: Record<string, Partial<{ title: string; icon: string; color: string; image: string; order: number }>>
  tileOverrides?: Record<string, Partial<{ title: string; speech: string; color: string; image: string }>>
  editMode?: boolean
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://app.tikoapi.org/v1').replace(/\/$/, '')
}

function resolveIdentityBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_IDENTITY_API_URL ?? env?.VITE_TIKO_IDENTITY_BASE_URL ?? 'https://id.tikoapps.org/v1').replace(/\/$/, '')
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function toLanguage(value: string | undefined): TikoLanguage {
  return tikoLanguages.includes(value as TikoLanguage) ? value as TikoLanguage : defaultLanguage
}

function toColorMode(value: string | undefined): TikoColorMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const userCollections = ref<CardsCollection[]>(stored.collections ?? [])
const navPath = ref<string[]>(stored.navPath ?? [])
const hiddenDefaults = ref<string[]>(stored.hiddenDefaults ?? [])
const collectionOverrides = ref<Record<string, Partial<{ title: string; icon: string; color: string; image: string; order: number }>>>(stored.collectionOverrides ?? {})
const tileOverrides = ref<Record<string, Partial<{ title: string; speech: string; color: string; image: string }>>>(stored.tileOverrides ?? {})
const remoteDefaults = ref<CardsCollection[]>([])
const editMode = ref(false)
const settingsOpen = ref(false)
const speakStatus = ref<SpeakStatus>('idle')
const currentPage = ref(1)

// Reactive columns and items per page based on viewport
const columns = computed(() => {
  if (typeof window === 'undefined') return 3
  const w = window.innerWidth
  if (w >= 640) return 5
  if (w >= 480) return 4
  return 3
})

const itemsPerPage = computed(() => {
  if (typeof window === 'undefined') return 12
  // Estimate available height: viewport minus header (~56px), dots (~30px), gaps
  const availableHeight = window.innerHeight - 100
  const tileWidth = (window.innerWidth - 16 - 12 * (columns.value - 1)) / columns.value // tile size with gap
  const rows = Math.max(2, Math.floor(availableHeight / tileWidth))
  return columns.value * rows
})
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const bootstrapped = ref(false)
const tts = createTikoTtsClient()
const identityClient = new IdentityClient({ baseUrl: identityBaseUrl, credentials: 'include' })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })
const newItemName = ref('')

// ---------------------------------------------------------------------------
// Identity runtime
// ---------------------------------------------------------------------------

const identityState: IdentityRuntimeState = {
  sessionToken: ref(''),
  userId: ref(''),
  accountEmail: ref(''),
  accountEmailVerified: ref(false),
  displayName: ref(''),
  parentMode: ref(true),
  childModeEnabled: ref(false),
  pinConfigured: ref(false),
}

const runtime = useIdentityRuntime({
  identityClient,
  state: identityState,
  deviceName: 'Cards web',
})

// ---------------------------------------------------------------------------
// Media integration (Supabase images for default collections)
// ---------------------------------------------------------------------------

const { fetchByCategory, search: searchMedia, loading: mediaLoading } = useTikoMedia()
const tileMediaMap = ref<Record<string, string>>({}) // tile.id → original_url
const colThumbMap = ref<Record<string, string>>({}) // collection.id → original_url (thumbnail)
const fetchedCollections = ref<Set<string>>(new Set()) // track which collections have been fetched

// ---------------------------------------------------------------------------
// Labels (i18n-driven)
// ---------------------------------------------------------------------------

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.cards.appName),
    emptyCollections: i18n.t(tikoI18nKeys.cards.collections.empty),
    emptyTiles: i18n.t(tikoI18nKeys.cards.tiles.empty),
    addNewCollection: i18n.t(tikoI18nKeys.cards.collections.addNew),
    addNewTile: i18n.t(tikoI18nKeys.cards.tiles.addNew),
    newNameCollection: i18n.t(tikoI18nKeys.cards.collections.newName),
    newNameTile: i18n.t(tikoI18nKeys.cards.tiles.newName),
    create: i18n.t(tikoI18nKeys.cards.collections.create),
    restoreDefaults: i18n.t(tikoI18nKeys.cards.settings.restoreDefaults),
    restoreConfirm: i18n.t(tikoI18nKeys.cards.settings.restoreConfirm),
    fallback: i18n.t(tikoI18nKeys.cards.status.browserVoiceFallback),
    speechError: i18n.t(tikoI18nKeys.cards.status.speechError),
  }
})

// ---------------------------------------------------------------------------
// Computed: merged root collections
// ---------------------------------------------------------------------------

function applyOverrides(collection: CardsCollection): CardsCollection {
  const overrides = collectionOverrides.value[collection.id]
  if (!overrides) return collection
  return {
    ...collection,
    title: overrides.title ?? collection.title,
    icon: overrides.icon ?? collection.icon,
    color: overrides.color ?? collection.color,
    image: overrides.image ?? collection.image,
    order: overrides.order ?? collection.order,
  }
}

const rootCollections = computed<CardsCollection[]>(() => {
  const defaults = remoteDefaults.value
    .filter((c) => !hiddenDefaults.value.includes(c.id))
    .map(applyOverrides)
  const all = [...defaults, ...userCollections.value]
  return all.sort((a, b) => a.order - b.order)
})

// ---------------------------------------------------------------------------
// Computed: navigation state
// ---------------------------------------------------------------------------

const isAtRoot = computed(() => navPath.value.length === 0)

const currentCollection = computed<CardsCollection | null>(() => {
  if (isAtRoot.value) return null
  const allCollections = rootCollections.value
  let current: CardsCollection | null = null
  for (const id of navPath.value) {
    const search: CardsCollection[] = current ? current.tiles.filter((t): t is CardsTile & { type: 'group' } => t.type === 'group') as unknown as CardsCollection[] : allCollections
    // For nested groups, look for a tile that acts as a sub-collection
    // For now, we only support one level of navigation into root collections
    current = search.find((c: CardsCollection) => c.id === id) ?? null
    if (!current) return null
  }
  return current
})

const currentTiles = computed<CardsTile[]>(() => {
  return currentCollection.value?.tiles ?? []
})

const breadcrumbLabels = computed<string[]>(() => {
  return navPath.value.map((id) => {
    const col = rootCollections.value.find((c) => c.id === id)
    return col?.title ?? id
  })
})

// ---------------------------------------------------------------------------
// Computed: pagination
// ---------------------------------------------------------------------------

const totalPages = computed(() => {
  const items = isAtRoot.value ? rootCollections.value : currentTiles.value
  return Math.max(1, Math.ceil(items.length / itemsPerPage.value))
})

// All visible items (not sliced by page)
const allChoices = computed(() => {
  const items = isAtRoot.value ? rootCollections.value : currentTiles.value
  if (isAtRoot.value) {
    return items.map((col: any) => {
      const override = collectionOverrides.value[col.id]
      return {
        id: col.id,
        label: override?.title ?? col.title,
        color: override?.color ?? col.color,
        imageSrc: cdnUrl(override?.image || colThumbMap.value[col.id] || col.image),
        speechText: col.title,
      }
    })
  }
  return items.map((tile: any) => {
    const override = tileOverrides.value[tile.id]
    return {
      id: tile.id,
      label: override?.title ?? tile.title,
      speechText: override?.speech ?? tile.speech ?? tile.title,
      imageSrc: cdnUrl(override?.image || tileMediaMap.value[tile.id] || tile.image),
      color: override?.color,
    }
  })
})

// Chunk all choices into pages
const allPages = computed(() => {
  const pages: typeof allChoices.value[] = []
  for (let i = 0; i < allChoices.value.length; i += itemsPerPage.value) {
    pages.push(allChoices.value.slice(i, i + itemsPerPage.value))
  }
  return pages.length > 0 ? pages : [[]] // always at least one empty page
})

const emptyMessage = computed(() => {
  if (isAtRoot.value) return labels.value.emptyCollections
  return labels.value.emptyTiles
})

const editPlaceholder = computed(() => {
  if (isAtRoot.value) return labels.value.newNameCollection
  return labels.value.newNameTile
})

const hasHiddenDefaults = computed(() => hiddenDefaults.value.length > 0)

const headerActions = computed(() => {
  const actions: Array<{ id: string; label: string; icon: string; active?: boolean; visible?: boolean }> = []

  if (identityState.parentMode.value) {
    actions.push({ id: 'manage', label: 'Add', icon: 'ui/plus' })
  }
  return actions
})

// ---------------------------------------------------------------------------
// Color mode
// ---------------------------------------------------------------------------

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function saveLocalFallback() {
  runtime.writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    collections: userCollections.value,
    navPath: navPath.value,
    hiddenDefaults: hiddenDefaults.value,
    collectionOverrides: collectionOverrides.value,
    tileOverrides: tileOverrides.value,
    editMode: editMode.value,
  })
}

function applySettings(settings: CardsSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  hiddenDefaults.value = settings.hiddenDefaults ?? []
  collectionOverrides.value = settings.collectionOverrides ?? {}
  tileOverrides.value = (settings as any).tileOverrides ?? {}
  settingsVersion.value = version
}

function applyState(state: CardsState, version?: number) {
  userCollections.value = (state.collections ?? []).filter((c) => !c.id.startsWith('__default_'))
  navPath.value = state.navPath ?? []
  editMode.value = state.editMode ?? false
  stateVersion.value = version
}

async function hydrateRemoteData() {
  if (!identityState.sessionToken.value) return
  const [settings, state, defaults] = await Promise.all([
    dataClient.getSettings(appId, identityState.sessionToken.value),
    dataClient.getState(appId, identityState.sessionToken.value),
    dataClient.getAppDefaults(appId, 'state').catch(() => null),
  ])
  applySettings(settings.settings, settings.version)
  applyState(state.state, state.version)

  if (defaults?.state?.collections && Array.isArray(defaults.state.collections)) {
    remoteDefaults.value = defaults.state.collections as CardsCollection[]
  }

}

async function persistSettingsRemote() {
  if (!bootstrapped.value || !identityState.sessionToken.value) return
  try {
    const response = await dataClient.putSettings(appId, identityState.sessionToken.value, {
      language: language.value,
      colorMode: colorMode.value,
      hiddenDefaults: hiddenDefaults.value,
      collectionOverrides: collectionOverrides.value,
      tileOverrides: tileOverrides.value,
    }, { version: settingsVersion.value })
    settingsVersion.value = response.version
  } catch {
    // Remote will retry on next edit.
  }
}

async function persistStateRemote() {
  if (!bootstrapped.value || !identityState.sessionToken.value) return
  try {
    const response = await dataClient.putState(appId, identityState.sessionToken.value, {
      collections: userCollections.value,
      navPath: navPath.value,
      editMode: editMode.value,
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Remote will retry on next edit.
  }
}

// ---------------------------------------------------------------------------
// Media integration: fetch images for default collection tiles
// ---------------------------------------------------------------------------

async function fetchMediaForCollection(collectionId: string) {
  const collection = remoteDefaults.value.find((c) => c.id === collectionId)
  const categories = collection?.mediaCategories
  if (!categories?.length || fetchedCollections.value.has(collectionId)) return

  fetchedCollections.value.add(collectionId)
  try {
    const results = await fetchByCategory(categories, { limit: 50 })
    if (results.length === 0) return

    // Build a map from media name/title keywords to original_url
    const mediaByUrl = new Map<string, TikoMedia>()
    const mediaByName = new Map<string, TikoMedia>()
    for (const m of results) {
      mediaByUrl.set(m.original_url, m)
      mediaByName.set(m.name.toLowerCase(), m)
      mediaByName.set(m.title.toLowerCase(), m)
    }

    if (!collection) return

    const updates: Record<string, string> = {}
    const matchedUrls = new Set<string>()

    // First pass: exact matches on tile title/name
    for (const tile of collection.tiles) {
      const key = tile.title.toLowerCase().replace(/\s+/g, '_')
      if (mediaByName.has(key)) {
        const media = mediaByName.get(key)!
        updates[tile.id] = media.original_url
        matchedUrls.add(media.original_url)
      } else if (mediaByName.has(tile.title.toLowerCase())) {
        const media = mediaByName.get(tile.title.toLowerCase())!
        updates[tile.id] = media.original_url
        matchedUrls.add(media.original_url)
      }
    }

    // Second pass: partial/tag matching for unmatched tiles
    for (const tile of collection.tiles) {
      if (updates[tile.id]) continue
      const tileWords = tile.title.toLowerCase().split(/\s+/)
      for (const m of results) {
        if (matchedUrls.has(m.original_url)) continue
        const nameParts = m.name.toLowerCase().split(/[-_]+/)
        const match =
          m.tags?.some((t) => tileWords.some((w) => t.toLowerCase() === w || w === t.toLowerCase().split(/\s+/)[0])) ||
          nameParts.some((p) => tileWords.includes(p))
        if (match) {
          updates[tile.id] = m.original_url
          matchedUrls.add(m.original_url)
          break
        }
      }
    }

    // NOTE: No positional fallback — unmatched tiles show colored bg + text label
    // rather than a random unrelated image

    console.log('[Cards] tileMediaMap updates:', Object.keys(updates).length, 'tiles with images')
    tileMediaMap.value = { ...tileMediaMap.value, ...updates }

    // Set collection thumbnail from first result
    if (results[0]?.original_url) {
      console.log('[Cards] colThumbMap set:', collectionId, results[0].original_url.slice(-30))
      colThumbMap.value = { ...colThumbMap.value, [collectionId]: results[0].original_url }
    }
  } catch (err) {
    console.error('[Cards] fetchMediaForCollection error:', err)
  }
}

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

watch(language, (value) => {
  i18n.setLanguage(value)
}, { immediate: true })

watch(colorMode, (mode) => {
  const effective = resolveColorMode(mode)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode, hiddenDefaults, collectionOverrides, tileOverrides], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

watch([userCollections, navPath, editMode], () => {
  saveLocalFallback()
  void persistStateRemote()
}, { deep: true })

// Reset page when navigating
watch(navPath, () => {
  currentPage.value = 1
  // Fetch media images when entering a default collection
  const lastId = navPath.value[navPath.value.length - 1]
  console.log('[Cards] navPath changed:', navPath.value, 'lastId:', lastId)
  if (lastId?.startsWith('__default_')) {
    void fetchMediaForCollection(lastId)
  }
})

// ---------------------------------------------------------------------------
// TTS
// ---------------------------------------------------------------------------

async function speak(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  speakStatus.value = 'speaking'
  try {
    const result = await tts.speak({ text: trimmed, language: language.value, provider: 'auto' })
    speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
  } catch {
    speakStatus.value = 'error'
  }
}

// ---------------------------------------------------------------------------
// Dominant image color extraction (client-side canvas)
// ---------------------------------------------------------------------------
const dominantColorCache = ref<Record<string, string>>({})
const colorCanvas = document.createElement('canvas')
const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true })!

function extractDominantColor(src: string): void {
  if (dominantColorCache.value[src]) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const size = 32
      colorCanvas.width = size
      colorCanvas.height = size
      colorCtx.drawImage(img, 0, 0, size, size)
      const data = colorCtx.getImageData(0, 0, size, size).data

      // Quantize pixels into color buckets (step 32 → 8 buckets per channel)
      const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {}
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]; const g = data[i + 1]; const b = data[i + 2]
        const key = `${(r >> 5) << 5},${(g >> 5) << 5},${(b >> 5) << 5}`
        if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, count: 0 }
        buckets[key].r += r; buckets[key].g += g; buckets[key].b += b; buckets[key].count++
      }

      // Find the bucket with the most pixels
      let best = { r: 0, g: 0, b: 0, count: 0 }
      for (const b of Object.values(buckets)) {
        if (b.count > best.count) best = b
      }

      // Average the bucket, then brighten by ~15%
      const avg = (c: number) => Math.round(c / best.count)
      let r = avg(best.r); let g = avg(best.g); let b = avg(best.b)
      const brighten = (v: number) => Math.min(255, v + Math.round((255 - v) * 0.15))
      r = brighten(r); g = brighten(g); b = brighten(b)

      dominantColorCache.value = { ...dominantColorCache.value, [src]: `rgb(${r},${g},${b})` }
      console.log('[Cards] dominantColorCache set:', src.slice(-30), dominantColorCache.value[src])
    } catch {
      dominantColorCache.value = { ...dominantColorCache.value, [src]: '#333' }
    }
  }
  img.onerror = () => {
    dominantColorCache.value = { ...dominantColorCache.value, [src]: '#333' }
  }
  img.src = src
}

// Watch for new imageSrcs and extract colors (use cdnUrl for cache key matching)
watch(tileMediaMap, (map) => {
  for (const src of Object.values(map)) {
    const url = cdnUrl(src)
    if (url) extractDominantColor(url)
  }
}, { deep: true })

watch(colThumbMap, (map) => {
  for (const src of Object.values(map)) {
    const url = cdnUrl(src)
    if (url) extractDominantColor(url)
  }
}, { deep: true })

function getDominantColor(src: string | undefined): string {
  if (!src) return '#666'
  return dominantColorCache.value[src] || '#333'
}

console.log('[Cards] getDominantColor fn loaded')

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function navigateTo(collectionId: string) {
  navPath.value = [...navPath.value, collectionId]
  currentPage.value = 1
}

function navigateBack() {
  if (navPath.value.length > 0) {
    navPath.value = navPath.value.slice(0, -1)
    currentPage.value = 1
  }
}

// ---------------------------------------------------------------------------
// Choice handler
// ---------------------------------------------------------------------------

function handleChoice(id: string) {
  if (isAtRoot.value) {
    // At root: tapping a collection navigates into it
    navigateTo(id)
  } else {
    // Inside a collection: tapping a tile speaks it
    const tile = currentTiles.value.find((t) => t.id === id)
    if (tile) {
      void speak(tile.speech ?? tile.title)
    }
  }
}

// ---------------------------------------------------------------------------
// Edit mode: add / delete / hide
// ---------------------------------------------------------------------------

function addNewItem() {
  const name = newItemName.value.trim()
  if (!name) return

  if (isAtRoot.value) {
    // Add a new user collection
    const newCollection: CardsCollection = {
      id: generateId(),
      title: name,
      color: '#B8B8B8',
      order: rootCollections.value.length,
      tiles: [],
    }
    userCollections.value = [...userCollections.value, newCollection]
  } else {
    // Add a new tile to the current collection
    const currentId = navPath.value[navPath.value.length - 1]
    const newTile: CardsTile = {
      id: generateId(),
      title: name,
      type: 'card',
      speech: name,
    }
    // Check if it's a user collection (can be edited)
    const userCol = userCollections.value.find((c) => c.id === currentId)
    if (userCol) {
      userCol.tiles = [...userCol.tiles, newTile]
      userCollections.value = [...userCollections.value]
    }
  }

  newItemName.value = ''
}

function deleteOrHide(id: string) {
  if (isAtRoot.value) {
    // At root: hide if default, delete if user-created
    if (id.startsWith('__default_')) {
      if (!hiddenDefaults.value.includes(id)) {
        hiddenDefaults.value = [...hiddenDefaults.value, id]
      }
    } else {
      userCollections.value = userCollections.value.filter((c) => c.id !== id)
    }
  } else {
    // Inside a collection: delete the tile
    const currentId = navPath.value[navPath.value.length - 1]
    const userCol = userCollections.value.find((c) => c.id === currentId)
    if (userCol) {
      userCol.tiles = userCol.tiles.filter((t) => t.id !== id)
      userCollections.value = [...userCollections.value]
    }
    // Adjust page if needed
    const newTotalPages = Math.max(1, Math.ceil(userCol?.tiles.length ?? 0 / itemsPerPage.value))
    if (currentPage.value > newTotalPages) currentPage.value = newTotalPages
  }
}

function restoreDefaults() {
  hiddenDefaults.value = []
}

// ---------------------------------------------------------------------------
// CDN image URL helper — uses CF Image Resizing for smaller thumbnails
// ---------------------------------------------------------------------------
const CDN_ORIGIN = 'data.tikocdn.org'
function cdnUrl(originalUrl: string | undefined): string | undefined {
  if (!originalUrl) return undefined
  try {
    const u = new URL(originalUrl)
    if (u.hostname === CDN_ORIGIN && u.pathname.startsWith('/uploads/')) {
      return `https://${CDN_ORIGIN}/cdn-cgi/image/width=300,quality=80,f=auto${u.pathname}`
    }
  } catch {}
  return originalUrl
}

// ---------------------------------------------------------------------------
// Pointer-based pager drag (works for both touch and mouse)
// ---------------------------------------------------------------------------
const touchStartX = ref(0)
const touchDeltaX = ref(0)
const isDragging = ref(false)
const activePointerId = ref<number | null>(null)
const pagerWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 390)

function updatePagerWidth() {
  const el = document.querySelector('.cards-pager') as HTMLElement | null
  pagerWidth.value = el ? el.clientWidth : window.innerWidth
}

// CSS translate offset: -(currentPage-1) * pagerWidth + drag delta
const pagerOffset = computed(() => {
  const pageW = pagerWidth.value || window.innerWidth
  const base = -(currentPage.value - 1) * pageW
  if (isDragging.value) return base + touchDeltaX.value
  return base
})

function onPointerDown(e: PointerEvent) {
  updatePagerWidth()
  activePointerId.value = e.pointerId
  touchStartX.value = e.clientX
  touchDeltaX.value = 0
  isDragging.value = false
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (activePointerId.value !== e.pointerId) return
  if (e.pointerType === 'mouse' && e.buttons !== 1) return

  const dx = e.clientX - touchStartX.value
  // Only start dragging after 5px of movement — lets taps through.
  if (!isDragging.value && Math.abs(dx) > 5) {
    isDragging.value = true
  }
  if (!isDragging.value) return

  e.preventDefault()
  // Apply rubber-band at edges.
  let clamped = dx
  if ((currentPage.value <= 1 && dx > 0) || (currentPage.value >= totalPages.value && dx < 0)) {
    clamped = dx * 0.3
  }
  touchDeltaX.value = clamped
}

function onPointerUp(e?: PointerEvent) {
  if (e && activePointerId.value !== e.pointerId) return
  activePointerId.value = null
  if (!isDragging.value) return

  const threshold = pagerWidth.value * 0.2
  if (touchDeltaX.value < -threshold && currentPage.value < totalPages.value) {
    currentPage.value++
  } else if (touchDeltaX.value > threshold && currentPage.value > 1) {
    currentPage.value--
  }
  isDragging.value = false
  touchDeltaX.value = 0
}


// ---------------------------------------------------------------------------
// Context menu (right-click to edit tile)
// ---------------------------------------------------------------------------

const contextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)
const contextMenuChoiceId = ref<string>('')

const canEditTiles = computed(() => identityState.accountEmailVerified.value)

function onTileContextmenu(e: MouseEvent, choiceId: string) {
  if (!canEditTiles.value) return
  e.preventDefault()
  e.stopPropagation()
  contextMenuChoiceId.value = choiceId
  contextMenuRef.value?.open()
}

const editContextMenuConfig = {
  position: 'click' as const,
  menu: [
    {
      id: 'edit',
      label: 'Edit Card',
      icon: 'edit-fat',
      action: () => openEditPopup(contextMenuChoiceId.value),
    } as ContextMenuItem,
  ],
}

function closeContextMenu() {
  contextMenuRef.value?.close()
}

function openEditPopup(choiceId: string) {
  closeContextMenu()
  const choice = allChoices.value.find((c) => c.id === choiceId)
  if (!choice) return

  // Find the original tile data (from virtual defaults or user collections)
  const tile = currentTiles.value.find((t) => t.id === choiceId)
  const override = tileOverrides.value[choiceId]
  const isDefault = choiceId.startsWith('__default_')

  const draftTitle = ref(override?.title ?? tile?.title ?? choice.label)
  const draftSpeech = ref(override?.speech ?? tile?.speech ?? choice.speechText ?? choice.label)
  const draftColor = ref(override?.color ?? tile?.color ?? '')
  const draftImage = ref(override?.image ?? tile?.image ?? '')

  // Also track whether the original had a media-matched image
  const originalMediaImage = tileMediaMap.value[choiceId] || ''
  const effectiveImage = computed(() => {
    if (draftImage.value) return draftImage.value
    if (isDefault && originalMediaImage) return originalMediaImage
    return tile?.image ?? ''
  })

  function openImageSelector() {
    const query = ref('')
    const results = ref<TikoMedia[]>([])
    const searching = ref(false)
    const selectedUrl = ref('')

    async function doSearch() {
      if (!query.value.trim()) return
      searching.value = true
      try {
        results.value = await searchMedia(query.value.trim(), { limit: 30 })
      } catch (err) {
        console.error('[Cards] image search error:', err)
      } finally {
        searching.value = false
      }
    }

    popup.showPopup({
      component: markRaw({
        setup() {
          return () => h('div', { class: 'cards-img-picker', onClick: (e: Event) => e.stopPropagation() }, [
            // Search input
            h('div', { class: 'cards-img-picker__search' }, [
              h('input', {
                type: 'text',
                class: 'cards-img-picker__input',
                placeholder: 'Search images...',
                value: query.value,
                onInput: (e: Event) => { query.value = (e.target as HTMLInputElement).value },
                onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') doSearch() },
              }),
              h(Button, {
                variant: 'primary',
                class: 'cards-img-picker__search-btn',
                onClick: doSearch,
                disabled: !query.value.trim() || searching.value,
              }, () => searching.value ? '...' : 'Search'),
            ]),
            // Results grid
            results.value.length > 0
              ? h('div', { class: 'cards-img-picker__grid' }, results.value.map((m: TikoMedia) =>
                  h('button', {
                    key: m.id,
                    class: [
                      'cards-img-picker__item',
                      { 'cards-img-picker__item--selected': selectedUrl.value === m.original_url },
                    ].join(' '),
                    onClick: () => {
                      selectedUrl.value = m.original_url
                      draftImage.value = m.original_url
                      popup.closeAllPopups()
                    },
                  }, [
                    h('img', {
                      src: cdnUrl(m.original_url),
                      alt: m.title || m.name,
                      class: 'cards-img-picker__thumb',
                      loading: 'lazy',
                      crossorigin: 'anonymous',
                    }),
                  ])
                ))
              : h('p', { class: 'cards-img-picker__empty' }, query.value ? (searching.value ? 'Searching...' : 'No results') : 'Type to search for images'),
          ])
        },
      }),
      title: 'Pick an Image',
      config: { position: 'center', canClose: true, background: true, width: '28rem' },
    })
  }

  function removeImage() {
    draftImage.value = ''
  }

  popup.showPopup({
    component: markRaw({
      setup() {
        const colorPresets = ['#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3', '#10AC84', '#5F27CD', '#FF6B81', '#C44569', '#574B90', '#303952', '#B8B8B8']

        return () => h('div', { class: 'cards-edit-popup' }, [
          // Title
          h('label', { class: 'cards-edit-popup__label' }, 'Title'),
          h('input', {
            class: 'cards-edit-popup__input',
            value: draftTitle.value,
            onInput: (e: Event) => { draftTitle.value = (e.target as HTMLInputElement).value },
          }),

          // Speech
          h('label', { class: 'cards-edit-popup__label' }, 'Speech'),
          h('textarea', {
            class: 'cards-edit-popup__textarea',
            rows: 2,
            value: draftSpeech.value,
            onInput: (e: Event) => { draftSpeech.value = (e.target as HTMLTextAreaElement).value },
          }),

          // Color picker
          h('label', { class: 'cards-edit-popup__label' }, 'Color'),
          h('div', { class: 'cards-edit-popup__colors' }, [
            ...colorPresets.map((c: string) =>
              h('button', {
                key: c,
                class: [
                  'cards-edit-popup__color-swatch',
                  { 'cards-edit-popup__color-swatch--active': draftColor.value === c },
                ].join(' '),
                style: { backgroundColor: c },
                onClick: () => { draftColor.value = draftColor.value === c ? '' : c },
              })
            ),
            // Custom color input
            h('label', { class: 'cards-edit-popup__custom-color' }, [
              h('input', {
                type: 'color',
                value: draftColor.value || '#666666',
                onChange: (e: Event) => { draftColor.value = (e.target as HTMLInputElement).value },
              }),
              h('span', {}, '✎'),
            ]),
          ]),

          // Image
          h('label', { class: 'cards-edit-popup__label' }, 'Image'),
          h('div', { class: 'cards-edit-popup__image-row' }, [
            effectiveImage.value
              ? h('div', { class: 'cards-edit-popup__image-preview' }, [
                  h('img', {
                    src: cdnUrl(effectiveImage.value),
                    alt: 'Current image',
                    class: 'cards-edit-popup__image-thumb',
                    crossorigin: 'anonymous',
                  }),
                  h('button', {
                    class: 'cards-edit-popup__image-remove',
                    onClick: removeImage,
                  }, '✕'),
                ])
              : null,
            h(Button, {
              variant: 'secondary',
              onClick: openImageSelector,
            }, () => effectiveImage.value ? 'Change Image' : 'Browse Images'),
          ]),

          // Actions
          h('div', { class: 'cards-edit-popup__actions' }, [
            h(Button, {
              variant: 'primary',
              onClick: () => {
                // Apply overrides
                const newOverride: Partial<{ title: string; speech: string; color: string; image: string }> = {}
                const tileData = currentTiles.value.find((t) => t.id === choiceId)
                const hasChanges = (
                  (draftTitle.value && draftTitle.value !== tileData?.title) ||
                  (draftSpeech.value && draftSpeech.value !== tileData?.speech) ||
                  (draftColor.value) ||
                  (draftImage.value !== (tileData?.image ?? ''))
                )
                if (hasChanges) {
                  if (draftTitle.value) newOverride.title = draftTitle.value
                  if (draftSpeech.value) newOverride.speech = draftSpeech.value
                  if (draftColor.value) newOverride.color = draftColor.value
                  if (draftImage.value) newOverride.image = draftImage.value
                  tileOverrides.value = { ...tileOverrides.value, [choiceId]: newOverride }

                  // For user collections, also update the tile data directly
                  const currentId = navPath.value[navPath.value.length - 1]
                  const userCol = userCollections.value.find((c) => c.id === currentId)
                  if (userCol) {
                    const tileIdx = userCol.tiles.findIndex((t) => t.id === choiceId)
                    if (tileIdx >= 0) {
                      const updated = { ...userCol.tiles[tileIdx] }
                      if (newOverride.title) updated.title = newOverride.title
                      if (newOverride.speech) updated.speech = newOverride.speech
                      if (newOverride.color) updated.color = newOverride.color
                      if (newOverride.image) updated.image = newOverride.image
                      userCol.tiles = userCol.tiles.map((t, i) => i === tileIdx ? updated : t)
                      userCollections.value = [...userCollections.value]
                    }
                  }
                } else {
                  // Remove override if everything was reset to original
                  const updated = { ...tileOverrides.value }
                  delete updated[choiceId]
                  tileOverrides.value = updated
                }

                popup.closeAllPopups()
              },
            }, () => 'Save'),
            h(Button, {
              variant: 'ghost',
              onClick: () => { popup.closeAllPopups() },
            }, () => 'Cancel'),
          ]),
        ])
      },
    }),
    title: 'Edit Card',
    config: { position: 'center', canClose: true, background: true, width: '22rem' },
  })
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function goHome() {
  navPath.value = []
  currentPage.value = 1
  nextTick(updatePagerWidth)
}

function headerAction(id: string) {
  if (id === 'back') { navigateBack(); return }
  if (id === 'manage') openSettingsPopup()
  if (id === 'edit') editMode.value = !editMode.value
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
}

function openSettings() {
  settingsOpen.value = true
}

function openSettingsPopup() {
  popup.showPopup({
    component: markRaw({
      setup() {
        return () => h('div', { class: 'cards-app__settings-popup' }, [
          h(TikoSettingsPanel, {
            language: language.value,
            'onUpdate:language': (v: TikoLanguage) => { language.value = v },
            colorMode: colorMode.value,
            'onUpdate:colorMode': (v: TikoColorMode) => { colorMode.value = v },
          }),
          hasHiddenDefaults.value
            ? h('div', { class: 'cards-app__settings-extra' }, [
                h(Button, { class: 'cards-app__restore-btn', variant: 'secondary', onClick: restoreDefaults }, () => labels.value.restoreDefaults),
                h('p', { class: 'cards-app__restore-confirm' }, labels.value.restoreConfirm),
              ])
            : null,
        ])
      },
    }),
    title: '',
    config: { position: 'center', canClose: true, background: true, width: '22rem' },
    onClose: () => {},
  })
}

// ---------------------------------------------------------------------------
// Bootstrap lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  try {
    await runtime.bootstrapIdentity()
    await hydrateRemoteData()
  } catch {
    // Keep the local flow available when API bootstrap is offline.
  } finally {
    bootstrapped.value = true
    saveLocalFallback()
    // Fetch tiko media images for all visible default collections
    const visibleDefaults = remoteDefaults.value.filter((c) => !hiddenDefaults.value.includes(c.id))
    for (const col of visibleDefaults) {
      fetchMediaForCollection(col.id).catch(() => {})
    }
    // Initialize pager width
    nextTick(updatePagerWidth)
    window.addEventListener('resize', updatePagerWidth)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePagerWidth)
})
</script>

<template>
  <TikoAppShell
    :app-name="currentCollection?.title ?? labels.appName"
    :app-icon="appConfig.appIcon"
    :app-icon-media-category="appConfig.appIconMediaCategory"
    :app-color="appConfig.appColor"
    avatar="ui/avatar"
    :show-back="navPath.length > 0"
    :actions="headerActions"
    @header-action="headerAction"
    @avatar-click="runtime.handleAvatarClick"
    @back-click="navigateBack"
    @title-click="goHome"
  >
    <section class="cards-app" :data-color-mode="colorMode">
      <!-- Pager viewport — clips the sliding track -->
      <div
        v-if="allChoices.length > 0"
        class="cards-pager"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div
          class="cards-pager__track"
          :class="{ 'cards-pager__track--dragging': isDragging }"
          :style="{ transform: 'translateX(' + pagerOffset + 'px)', width: ((pagerWidth || 390) * allPages.length) + 'px' }"
        >
          <div
            v-for="(page, pi) in allPages"
            :key="'page-' + pi"
            class="cards-grid"
            :class="'cards-grid--cols-' + columns"
            :style="{ width: (pagerWidth || 390) + 'px', minWidth: (pagerWidth || 390) + 'px' }"
          >
            <div
              v-for="choice in page"
              :key="choice.id"
              class="cards-grid__tile"
              :class="{ 'cards-grid__tile--has-image': choice.imageSrc }"
              :style="{ backgroundColor: choice.imageSrc ? `color-mix(in srgb, ${getDominantColor(choice.imageSrc)} 75%, var(--color-background) 25%)` : (choice.color || '#666') }"
              role="button"
              tabindex="0"
              :aria-label="choice.label"
              @click="handleChoice(choice.id)"
              @keydown.enter="handleChoice(choice.id)"
              @contextmenu="onTileContextmenu($event, choice.id)"
            >
              <img v-if="choice.imageSrc" :src="choice.imageSrc" :alt="choice.label" class="cards-grid__tile-img" loading="lazy" crossorigin="anonymous" />
              <span v-else class="cards-grid__tile-label">{{ choice.label }}</span>
              <span v-if="choice.imageSrc" class="cards-grid__tile-name">{{ choice.label }}</span>
            </div>
          </div>
        </div>
      </div><!-- /cards-pager -->

      <!-- Pagination dots (below grid) -->
      <div v-if="totalPages > 1" class="cards-dots">
        <button
          v-for="p in totalPages"
          :key="p"
          class="cards-dots__dot"
          :class="{ 'cards-dots__dot--active': p === currentPage }"
          :aria-label="'Page ' + p"
          @click="currentPage = p"
        />
      </div>

      <!-- Empty state -->
      <p v-if="allChoices.length === 0" class="cards-app__empty">{{ emptyMessage }}</p>

      <!-- TTS status -->
      <p v-if="speakStatus === 'error'" class="cards-app__status cards-app__status--error" role="alert">{{ labels.speechError }}</p>

      <!-- Edit mode: action buttons on each visible choice -->
      <div v-if="editMode" class="cards-app__edit-bar">
        <input
          v-model="newItemName"
          class="cards-app__edit-input"
          :placeholder="editPlaceholder"
          @keydown.enter="addNewItem"
        />
        <Button class="cards-app__edit-add" variant="primary" @click="addNewItem">+ {{ labels.create }}</Button>
      </div>

      <!-- Edit mode: delete/hide buttons overlay -->
      <div v-if="editMode && allChoices.length > 0" class="cards-app__edit-actions">
        <button
          v-for="choice in allChoices"
          :key="`del-${choice.id}`"
          class="cards-app__delete-btn"
          :title="choice.id.startsWith('__default_') ? 'Hide' : 'Delete'"
          @click="deleteOrHide(choice.id)"
        >
          ×
        </button>
      </div>

      <!-- Popup host -->
      <Popup />
    </section>

    <!-- Context menu (right-click edit) -->
    <ContextMenu ref="contextMenuRef" :config="editContextMenuConfig">
      <div style="display: none"></div>
    </ContextMenu>
  </TikoAppShell>
</template>

<style scoped>
/* App shell constraint */
:deep(.tiko-app-shell__main) {
  max-width: 1200px;
  margin: 0 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* App section fills available space */
.cards-app {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* Pager viewport — clips the sliding track */
.cards-pager {
  flex: 1;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

/* Track: all pages side by side */
.cards-pager__track {
  display: flex;
  height: 100%;
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}

/* During drag: disable transition for real-time tracking */
.cards-pager__track--dragging {
  transition: none;
}

/* Pagination dots */
.cards-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px 0 4px;
}

.cards-dots__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: var(--color-foreground, rgba(255, 255, 255, 0.25));
  opacity: 0.3;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s ease, transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.cards-dots__dot--active {
  opacity: 1;
  transform: scale(1.2);
}

/* Cards grid — each page in the pager track */
.cards-grid {
  display: grid;
  gap: 12px;
  padding: 8px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  align-content: start;
  flex-shrink: 0;
  box-sizing: border-box;
}

/* Column classes — driven by JS `columns` computed */
.cards-grid--cols-3 { grid-template-columns: repeat(3, 1fr); }
.cards-grid--cols-4 { grid-template-columns: repeat(4, 1fr); }
.cards-grid--cols-5 { grid-template-columns: repeat(5, 1fr); }

.cards-grid__tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.cards-grid__tile:active {
  transform: scale(0.95);
}

/* Tile has image — background set by inline style from avg color extraction */
.cards-grid__tile--has-image {
  /* no hardcoded bg — backgroundColor comes from getAvgColor() */
}

.cards-grid__tile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 16px;
}

.cards-grid__tile-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: clamp(4px, 1vw, 10px) clamp(6px, 1.2vw, 12px);
  font-size: clamp(12px, 2vw, 20px);
  font-weight: 600;
  color: #fff;
  text-align: center;
  text-shadow: 0 1px 4px rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.3);
  border-radius: 0 0 16px 16px;
  pointer-events: none;
}

/* When tile has NO image — colored square with label */
.cards-grid__tile-label {
  font-size: clamp(13px, 2.2vw, 22px);
  font-weight: 600;
  color: #fff;
  text-align: center;
  padding: 4px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* ------------------------------------------------------------------ */
/* Edit card popup                                                     */
/* ------------------------------------------------------------------ */

.cards-edit-popup {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding: .5rem 0;
}

.cards-edit-popup__label {
  font-size: .75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  opacity: .6;
  margin-bottom: -.25rem;
}

.cards-edit-popup__input,
.cards-edit-popup__textarea {
  width: 100%;
  padding: .5rem .75rem;
  border: 1px solid color-mix(in srgb, var(--tiko-surface), var(--color-foreground) 15%);
  border-radius: .75rem;
  background: var(--tiko-surface);
  color: inherit;
  font-size: .95rem;
  box-sizing: border-box;
}

.cards-edit-popup__input:focus,
.cards-edit-popup__textarea:focus {
  outline: none;
  border-color: var(--color-primary, #5F27CD);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #5F27CD), transparent 70%);
}

.cards-edit-popup__textarea {
  resize: vertical;
  min-height: 3rem;
}

.cards-edit-popup__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cards-edit-popup__color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform .15s ease, border-color .15s ease;
}

.cards-edit-popup__color-swatch:hover {
  transform: scale(1.15);
}

.cards-edit-popup__color-swatch--active {
  border-color: var(--color-foreground, #333);
  transform: scale(1.15);
}

.cards-edit-popup__custom-color {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--tiko-surface);
  border: 2px dashed color-mix(in srgb, var(--tiko-surface), var(--color-foreground) 30%);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.cards-edit-popup__custom-color input[type="color"] {
  position: absolute;
  inset: -8px;
  width: calc(100% + 16px);
  height: calc(100% + 16px);
  cursor: pointer;
  opacity: 0;
}

.cards-edit-popup__custom-color span {
  font-size: .8rem;
  opacity: .5;
  pointer-events: none;
}

.cards-edit-popup__image-row {
  display: flex;
  align-items: center;
  gap: .75rem;
}

.cards-edit-popup__image-preview {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.cards-edit-popup__image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cards-edit-popup__image-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: #e84057;
  color: #fff;
  font-size: .65rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}

.cards-edit-popup__actions {
  display: flex;
  gap: .5rem;
  padding-top: .5rem;
}

/* ------------------------------------------------------------------ */
/* Image picker popup                                                  */
/* ------------------------------------------------------------------ */

.cards-img-picker {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding: .5rem 0;
}

.cards-img-picker__search {
  display: flex;
  gap: .5rem;
}

.cards-img-picker__input {
  flex: 1;
  padding: .5rem .75rem;
  border: 1px solid color-mix(in srgb, var(--tiko-surface), var(--color-foreground) 15%);
  border-radius: .75rem;
  background: var(--tiko-surface);
  color: inherit;
  font-size: .95rem;
  min-width: 0;
}

.cards-img-picker__input:focus {
  outline: none;
  border-color: var(--color-primary, #5F27CD);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #5F27CD), transparent 70%);
}

.cards-img-picker__search-btn {
  flex-shrink: 0;
}

.cards-img-picker__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-height: 50vh;
  overflow-y: auto;
  padding: 2px;
}

.cards-img-picker__item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  border: 3px solid transparent;
  background: var(--tiko-surface);
  cursor: pointer;
  transition: border-color .15s ease, transform .15s ease;
  padding: 0;
}

.cards-img-picker__item:hover {
  transform: scale(1.03);
  border-color: color-mix(in srgb, var(--color-primary, #5F27CD), transparent 50%);
}

.cards-img-picker__item--selected {
  border-color: var(--color-primary, #5F27CD);
}

.cards-img-picker__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cards-img-picker__empty {
  text-align: center;
  opacity: .5;
  font-weight: 600;
  padding: 2rem .5rem;
}
</style>
