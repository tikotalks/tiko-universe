<script setup lang="ts">
import { computed, h, inject, markRaw, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, Popup, type PopupService } from '@sil/ui'
import { IdentityClient } from '@tiko/identity'
import { TikoDataClient, type CardsSettings } from '@tiko/data'
import { createI18n, createTikoIdentityLabels, createTikoShellLabels, normalizeTikoLanguage, tikoI18nKeys, tikoLanguageOptions, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  createTikoTtsClient,
  normalizeTikoColorMode,
  readTikoLocalJson,
  resolveTikoAppApiBaseUrl,
  resolveTikoIdentityBaseUrl,
  useTikoAppSettingsRuntime,
  useTikoColorModeEffect,
  useTikoI18nRuntime,
  useIdentityRuntime,
  type IdentityRuntimeState,
  type TikoColorMode,
  type TikoHeaderAction,
} from '@tiko/ui'
import { appConfig } from './appConfig'
import CardsBoard from './components/CardsBoard.vue'
import CardsBulkActionsSheet from './components/CardsBulkActionsSheet.vue'
import CardsCardSheet from './components/CardsCardSheet.vue'
import CardsCollectionSheet from './components/CardsCollectionSheet.vue'
import CardsSettingsSheet from './components/CardsSettingsSheet.vue'
import { useCardsStore } from './composables/useCardsStore'
import type { CardCollection, CardsGridItem, CommunicationCard, PersistedCards, SpeakStatus } from './types'
import './styles.scss'

type PopupKind = 'add-collection' | 'add-card' | 'edit-collection' | 'edit-card' | 'bulk-actions' | 'settings'

interface PopupContext {
  collection?: CardCollection
  card?: CommunicationCard
  collectionID?: string
}

const storageKey = 'tiko:cards:web'
const appId = 'cards' as const
const popup = inject<PopupService>('popupService')!
const tts = createTikoTtsClient()
const appBemm = useBemm('cards-app', { return: 'string', includeBaseClass: true })
const bulkBemm = useBemm('cards-bulk-bar', { return: 'string', includeBaseClass: true })
const fabBemm = useBemm('cards-fab', { return: 'string', includeBaseClass: true })
const popupContext = ref<PopupContext>({})
const page = ref(0)
const speakingCardID = ref<string>()
const speakStatus = ref<SpeakStatus>('idle')

const stored = readStored()
const i18n = createI18n({ app: appId, language: normalizeTikoLanguage(stored.language) })
const language = ref<TikoLanguage>(normalizeTikoLanguage(stored.language))
const colorMode = ref<TikoColorMode>(normalizeTikoColorMode(stored.colorMode))
const hideDefaultCollections = ref(stored.hideDefaultCollections ?? false)
const showAnimations = ref(stored.showAnimations ?? true)
const cardSizeIndex = ref(clampIndex(stored.cardSizeIndex ?? 1))
const labelSizeIndex = ref(clampIndex(stored.labelSizeIndex ?? 1))
const collectionsHydrated = ref(false)
const bootstrapped = ref(false)

const identityClient = new IdentityClient({ baseUrl: resolveTikoIdentityBaseUrl(), credentials: 'include' })
const dataClient = new TikoDataClient({ baseUrl: resolveTikoAppApiBaseUrl() })
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
  labels: () => createTikoIdentityLabels(i18n.t),
})

const cards = useCardsStore({
  storageKey,
  sessionToken: identityState.sessionToken,
  readStored,
  writeStored,
})
const settingsRuntime = useTikoAppSettingsRuntime<typeof appId, CardsSettings>({
  app: appId,
  sessionToken: identityState.sessionToken,
  bootstrapped,
  dataClient,
  readSettings: () => ({
    language: language.value,
    colorMode: colorMode.value,
    hideDefaultCollections: hideDefaultCollections.value,
    showAnimations: showAnimations.value,
    cardSizeIndex: cardSizeIndex.value,
    labelSizeIndex: labelSizeIndex.value,
  }),
  applySettings: applyRemoteSettings,
})

const labels = computed(() => {
  return {
    appName: i18n.t(tikoI18nKeys.cards.appName),
    add: i18n.t('cards.addCard'),
    done: i18n.t('cards.done'),
    actions: i18n.t('common.actionsLabel'),
    editCards: i18n.t('common.actions.edit'),
    settings: i18n.t('common.settings'),
    loadingCards: i18n.t('cards.loadingCards'),
    loadingPictures: i18n.t('cards.add.suggestionsFromTiko'),
    selected: i18n.t('cards.selected'),
    shell: createTikoShellLabels(i18n.t),
    emptyCollections: i18n.t(tikoI18nKeys.cards.collections.empty),
    emptyTiles: i18n.t(tikoI18nKeys.cards.tiles.empty),
    speechError: i18n.t(tikoI18nKeys.cards.status.speechError),
    sheet: {
      newCard: i18n.t('cards.add.newCard'),
      editCard: i18n.t('cards.add.editCard'),
      newCategory: i18n.t('cards.add.newCategory'),
      editCategory: i18n.t('cards.add.editCategory'),
      name: i18n.t('cards.add.name'),
      cardNamePlaceholder: i18n.t('cards.add.namePlaceholderCard'),
      categoryNamePlaceholder: i18n.t('cards.add.namePlaceholderCategory'),
      spokenText: i18n.t('cards.add.spokenText'),
      whatShouldBeSpoken: i18n.t('cards.add.whatShouldBeSpoken'),
      color: i18n.t('cards.add.color'),
      image: i18n.t('cards.add.image'),
      changeImage: i18n.t('cards.add.changeImage'),
      addImage: i18n.t('cards.add.addImage'),
      cancel: i18n.t('common.cancel'),
      addCard: i18n.t('cards.add.addCard'),
      addCategory: i18n.t('cards.add.addCategory'),
      save: i18n.t('cards.add.saveChanges'),
      parentCollection: i18n.t('cards.settings.collections'),
      none: i18n.t('common.none'),
      settings: i18n.t('common.settings'),
      hideDefaultSets: i18n.t('cards.settings.hideDefaultSets'),
      showAnimations: i18n.t('cards.settings.showAnimations'),
      cardSize: i18n.t('cards.settings.cardSize'),
      labelSize: i18n.t('cards.settings.labelSize'),
      small: i18n.t('common.size.small'),
      medium: i18n.t('common.size.medium'),
      large: i18n.t('common.size.large'),
      settingsPanel: {
        settings: i18n.t(tikoI18nKeys.common.settings),
        appearance: i18n.t(tikoI18nKeys.common.appearance),
        appPreferences: i18n.t(tikoI18nKeys.common.appPreferences),
        language: i18n.t(tikoI18nKeys.common.language),
        colorMode: i18n.t(tikoI18nKeys.common.colorMode),
        light: i18n.t(tikoI18nKeys.common.colorModeOptions.light),
        dark: i18n.t(tikoI18nKeys.common.colorModeOptions.dark),
        system: i18n.t(tikoI18nKeys.common.colorModeOptions.system),
      },
      selected: i18n.t('cards.selected'),
      moveToCollection: i18n.t('cards.settings.collections'),
      changeColor: i18n.t('cards.add.color'),
      delete: i18n.t('cards.deleteSelectedCards'),
      back: i18n.t('common.back'),
      applyColor: i18n.t('cards.add.saveChanges'),
      pickImage: i18n.t('cards.add.image'),
      search: i18n.t('cards.searchCards'),
      searching: i18n.t('cards.generatingTranslation'),
      searchImages: i18n.t('cards.suggestImageBasedOn'),
      typeToSearch: i18n.t('cards.tryDifferentSearch'),
    },
  }
})

const headerActions = computed<TikoHeaderAction[]>(() => {
  if (cards.editMode.value) return [{ id: 'done', label: labels.value.done, icon: 'ui/check-fat' }]
  return [{ id: 'add', label: labels.value.add, icon: 'ui/plus' }]
})

const visibleItems = computed(() => cards.gridItems(hideDefaultCollections.value))
const rootCollections = computed(() => cards.rootCollections(hideDefaultCollections.value))
const columns = computed(() => {
  if (typeof window === 'undefined') return 3
  const width = window.innerWidth
  const height = window.innerHeight
  const base = width > height * 1.4
    ? width >= 800 ? 7 : 6
    : width >= 640 ? 5 : width >= 480 ? 4 : 3
  return Math.max(2, base + (1 - cardSizeIndex.value))
})

const itemsPerPage = computed(() => {
  if (typeof window === 'undefined') return 12
  const gap = 12
  const usableWidth = Math.max(280, window.innerWidth - 24)
  const usableHeight = Math.max(240, window.innerHeight - 100)
  const cardSize = (usableWidth - (columns.value - 1) * gap) / columns.value
  const rows = Math.max(1, Math.floor((usableHeight - 24) / (cardSize + gap)))
  return columns.value * rows
})

const labelSize = computed<'small' | 'medium' | 'large'>(() => labelSizeIndex.value === 0 ? 'small' : labelSizeIndex.value === 2 ? 'large' : 'medium')
const isAdmin = computed(() => identityState.accountEmailVerified.value === true)
const appTitle = computed(() => {
  const collection = cards.currentCollection.value
  return collection ? collection.title : labels.value.appName
})

function translateGridItemTitle(item: CardsGridItem) {
  return item.kind === 'collection'
    ? item.collection.title
    : item.card.title
}

function activateItem(item: CardsGridItem) {
  if (cards.editMode.value) return
  if (item.kind === 'collection') {
    page.value = 0
    cards.navigateTo(item.collection)
    return
  }
  void speak(item.card)
}

function editItem(item: CardsGridItem) {
  if (item.kind === 'collection') {
    popupContext.value = { collection: item.collection }
    showPopup('edit-collection')
    return
  }
  popupContext.value = { card: item.card, collectionID: item.collectionID }
  showPopup('edit-card')
}

function headerAction(id: string) {
  if (id === 'done') {
    cards.clearEditMode()
    return
  }
  if (id !== 'add') return
  if (cards.currentCollection.value) {
    popupContext.value = { collection: cards.currentCollection.value }
    showPopup('add-card')
  } else {
    popupContext.value = {}
    showPopup('add-collection')
  }
}

async function speak(card: CommunicationCard) {
  const text = card.speech.trim() || card.title.trim()
  if (!text) return
  speakingCardID.value = card.id
  speakStatus.value = 'speaking'
  try {
    await tts.speak({ text, language: language.value })
    speakStatus.value = 'idle'
  } catch {
    speakStatus.value = 'error'
  } finally {
    window.setTimeout(() => {
      if (speakingCardID.value === card.id) speakingCardID.value = undefined
    }, 450)
  }
}

function showPopup(kind: PopupKind) {
  popup.showPopup({
    id: `cards-${kind}`,
    closePopups: true,
    title: '',
    component: markRaw({
      setup() {
        return () => renderPopup(kind)
      },
    }),
    config: {
      position: 'center',
      canClose: true,
      background: true,
      width: kind === 'settings' ? '28rem' : '26rem',
    },
  })
}

function renderPopup(kind: PopupKind) {
  if (kind === 'add-collection') {
    return h(CardsCollectionSheet, {
      mode: 'add',
      collections: cards.collections.value,
      parentID: cards.currentCollection.value?.id,
      labels: labels.value.sheet,
      onSubmit: async (value) => {
        await cards.createCollection(value)
        popup.closeAllPopups()
      },
      onCancel: popup.closeAllPopups,
    })
  }
  if (kind === 'edit-collection' && popupContext.value.collection) {
    return h(CardsCollectionSheet, {
      mode: 'edit',
      collection: popupContext.value.collection,
      collections: cards.collections.value,
      labels: labels.value.sheet,
      onSubmit: async (value) => {
        await cards.updateCollection(popupContext.value.collection!.id, value)
        popup.closeAllPopups()
      },
      onCancel: popup.closeAllPopups,
    })
  }
  if (kind === 'add-card' && popupContext.value.collection) {
    return h(CardsCardSheet, {
      mode: 'add',
      collection: popupContext.value.collection,
      labels: labels.value.sheet,
      onSubmit: async (value) => {
        await cards.createCard(popupContext.value.collection!.id, value)
        popup.closeAllPopups()
      },
      onCancel: popup.closeAllPopups,
    })
  }
  if (kind === 'edit-card' && popupContext.value.card && popupContext.value.collectionID) {
    const collection = cards.collections.value.find(item => item.id === popupContext.value.collectionID)
    if (!collection) return null
    return h(CardsCardSheet, {
      mode: 'edit',
      collection,
      card: popupContext.value.card,
      labels: labels.value.sheet,
      onSubmit: async (value) => {
        await cards.updateCard(popupContext.value.collectionID!, popupContext.value.card!.id, value)
        popup.closeAllPopups()
      },
      onCancel: popup.closeAllPopups,
    })
  }
  if (kind === 'bulk-actions') {
    return h(CardsBulkActionsSheet, {
      count: cards.selectedCount.value,
      collections: rootCollections.value,
      labels: labels.value.sheet,
      onDelete: async () => {
        await cards.deleteSelected()
        popup.closeAllPopups()
      },
      onMove: async (collectionID: string) => {
        await cards.moveSelected(collectionID)
        popup.closeAllPopups()
      },
      onColor: async (color) => {
        await cards.recolorSelected(color)
        popup.closeAllPopups()
      },
      onClose: popup.closeAllPopups,
    })
  }
  return h(CardsSettingsSheet, {
    language: language.value,
    colorMode: colorMode.value,
    hideDefaultCollections: hideDefaultCollections.value,
    showAnimations: showAnimations.value,
    cardSizeIndex: cardSizeIndex.value,
    labelSizeIndex: labelSizeIndex.value,
    languages: tikoLanguageOptions,
    labels: labels.value.sheet,
    'onUpdate:language': (value: TikoLanguage) => { language.value = value },
    'onUpdate:colorMode': (value: TikoColorMode) => { colorMode.value = value },
    'onUpdate:hideDefaultCollections': (value: boolean) => { hideDefaultCollections.value = value },
    'onUpdate:showAnimations': (value: boolean) => { showAnimations.value = value },
    'onUpdate:cardSizeIndex': (value: number) => { cardSizeIndex.value = clampIndex(value) },
    'onUpdate:labelSizeIndex': (value: number) => { labelSizeIndex.value = clampIndex(value) },
  })
}

function readStored(): PersistedCards {
  return readTikoLocalJson<PersistedCards>(storageKey, {})
}

function writeStored(state: PersistedCards) {
  runtime.writeJson(storageKey, {
    ...state,
    language: language.value,
    colorMode: colorMode.value,
    hideDefaultCollections: hideDefaultCollections.value,
    showAnimations: showAnimations.value,
    cardSizeIndex: cardSizeIndex.value,
    labelSizeIndex: labelSizeIndex.value,
  })
}

function clampIndex(value: number) {
  return Math.min(2, Math.max(0, Number.isFinite(value) ? value : 1))
}

function applyRemoteSettings(settings: CardsSettings) {
  language.value = normalizeTikoLanguage(settings.language)
  colorMode.value = normalizeTikoColorMode(settings.colorMode)
  hideDefaultCollections.value = typeof settings.hideDefaultCollections === 'boolean'
    ? settings.hideDefaultCollections
    : hideDefaultCollections.value
  showAnimations.value = typeof settings.showAnimations === 'boolean'
    ? settings.showAnimations
    : showAnimations.value
  cardSizeIndex.value = typeof settings.cardSizeIndex === 'number'
    ? clampIndex(settings.cardSizeIndex)
    : cardSizeIndex.value
  labelSizeIndex.value = typeof settings.labelSizeIndex === 'number'
    ? clampIndex(settings.labelSizeIndex)
    : labelSizeIndex.value
}

useTikoI18nRuntime({
  app: appId,
  language,
  i18n,
  onLanguageChange: value => {
    if (collectionsHydrated.value) void cards.loadCollections(value)
  },
})

useTikoColorModeEffect(colorMode)

watch([language, colorMode, hideDefaultCollections, showAnimations, cardSizeIndex, labelSizeIndex], () => cards.persist({
  language: language.value,
  colorMode: colorMode.value,
  hideDefaultCollections: hideDefaultCollections.value,
  showAnimations: showAnimations.value,
  cardSizeIndex: cardSizeIndex.value,
  labelSizeIndex: labelSizeIndex.value,
}))

watch([language, colorMode, hideDefaultCollections, showAnimations, cardSizeIndex, labelSizeIndex], () => {
  void settingsRuntime.persistSettingsRemote()
})

watch(() => cards.collectionStack.value.join('/'), () => {
  page.value = 0
})

onMounted(async () => {
  try {
    await runtime.bootstrapIdentity()
    await settingsRuntime.hydrateRemoteSettings()
  } catch {
    // Cards must remain usable from local/default content when identity is unavailable.
  } finally {
    bootstrapped.value = true
  }
  await cards.loadCollections(language.value)
  collectionsHydrated.value = true
  await Promise.allSettled(rootCollections.value.slice(0, 8).map(collection => cards.hydrateMedia(collection.id, false)))
})
</script>

<template>
  <TikoAppShell
    :app-name="appTitle"
    :app-icon="appConfig.appIcon"
    :app-icon-image-url="appConfig.appIconImageUrl"
    :app-icon-media-category="appConfig.appIconMediaCategory"
    :app-color="appConfig.appColor"
    :theme-color="appConfig.themeColor"
    avatar="ui/avatar"
    :show-back="cards.collectionStack.value.length > 0"
    :actions="headerActions"
    :labels="labels.shell"
    @header-action="headerAction"
    @avatar-click="runtime.handleAvatarClick"
    @back-click="cards.navigateBack"
    @title-click="cards.goHome"
  >
    <section :class="appBemm('', { editing: cards.editMode.value })">
      <div v-if="cards.loadingCollections.value && !visibleItems.length" :class="appBemm('loading')">{{ labels.loadingCards }}</div>
      <CardsBoard
        v-else-if="visibleItems.length"
        v-model:page="page"
        :items="visibleItems"
        :columns="columns"
        :items-per-page="itemsPerPage"
        :reduce-motion="!showAnimations"
        :editing="cards.editMode.value"
        :is-admin="isAdmin"
        :label-size="labelSize"
        :selected-collection-ids="cards.selectedCollectionIDs.value"
        :selected-card-ids="cards.selectedCardIDs.value"
        :collection-thumbnails="cards.collectionThumbnails.value"
        :card-images="cards.cardImages.value"
        :content-base-url="cards.contentBaseUrl"
        :speaking-card-i-d="speakingCardID"
        :translate-title="translateGridItemTitle"
        :labels="labels.shell"
        @activate="activateItem"
        @edit="editItem"
        @select="cards.toggleSelection"
        @drag-start="cards.onDragStart"
        @drop-item="cards.onDropItem"
        @start-edit="cards.startEditMode"
      />
      <p v-else :class="appBemm('empty')">{{ cards.currentCollection.value ? labels.emptyTiles : labels.emptyCollections }}</p>

      <div v-if="cards.loadingMediaIDs.value.has(cards.currentCollection.value?.id ?? '')" :class="appBemm('status')">{{ labels.loadingPictures }}</div>
      <p v-if="speakStatus === 'error'" :class="appBemm('status', { error: true })" role="alert">{{ labels.speechError }}</p>

      <div v-if="cards.editMode.value && cards.selectedCount.value > 0" :class="bulkBemm('')">
        <button type="button" :class="bulkBemm('clear')" @click="cards.selectedCardIDs.value = new Set(); cards.selectedCollectionIDs.value = new Set()">×</button>
        <span>{{ cards.selectedCount.value }} {{ labels.selected }}</span>
        <button type="button" :class="bulkBemm('actions')" @click="showPopup('bulk-actions')">{{ labels.actions }}</button>
      </div>

      <button v-if="!cards.editMode.value" type="button" :class="fabBemm('', { edit: true })" :aria-label="labels.editCards" @click="cards.startEditMode">✎</button>
      <button type="button" :class="fabBemm('', { settings: true })" :aria-label="labels.settings" @click="showPopup('settings')">⚙</button>

      <Popup />
    </section>
  </TikoAppShell>
</template>
