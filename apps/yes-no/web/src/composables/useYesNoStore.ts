import { computed, ref, type Ref } from 'vue'
import { tikoColors, tikoContentImageRefUrl } from '@tiko/ui'
import type { TikoColorName } from '@tiko/data'
import type { AnswerSet, AnswerSetInput, AnswerTile, AnswerTileInput, PersistedYesNo } from '../types'
import { createYesNoApi, resolveContentBaseUrl } from './yesNoApi'

const colorNames = new Set<TikoColorName>(tikoColors.map(color => color.name as TikoColorName))
const colorValueByName = new Map<TikoColorName, string>(tikoColors.map(color => [color.name as TikoColorName, color.hex]))
const fallbackColors = ['green', 'red', 'blue', 'teal', 'orange', 'purple'] as const

export interface UseYesNoStoreOptions {
  storageKey: string
  sessionToken: Ref<string>
  readStored: () => PersistedYesNo
  writeStored: (state: PersistedYesNo) => void
}

export function useYesNoStore(options: UseYesNoStoreOptions) {
  const stored = options.readStored()
  const api = createYesNoApi({ baseUrl: resolveContentBaseUrl(), getSessionToken: () => options.sessionToken.value ?? '' })

  const answerSets = ref<AnswerSet[]>(stored.answerSets ?? [])
  const selectedSetId = ref<string | null>(stored.selectedSetId ?? null)
  const loading = ref(false)
  const hydrated = ref(false)

  const selectedSet = computed<AnswerSet | null>(() => {
    if (!answerSets.value.length) return null
    const id = selectedSetId.value
    if (id) {
      const found = answerSets.value.find(set => set.id === id)
      if (found) return found
    }
    return answerSets.value[0] ?? null
  })

  function persist(extra: Partial<PersistedYesNo> = {}) {
    options.writeStored({
      ...options.readStored(),
      ...extra,
      answerSets: answerSets.value.map(normalizeSet),
      selectedSetId: selectedSetId.value,
    })
  }

  async function loadContent(language?: string) {
    loading.value = true
    try {
      const data = await api.fetchContent(language)
      const sets = (data.answerSets ?? []).map(normalizeSet).sort((a, b) => a.order - b.order)
      if (sets.length) {
        answerSets.value = sets
        if (data.selectedSetId && sets.some(set => set.id === data.selectedSetId)) {
          selectedSetId.value = data.selectedSetId
        } else if (!selectedSetId.value || !sets.some(set => set.id === selectedSetId.value)) {
          selectedSetId.value = sets[0]?.id ?? null
        }
      } else if (Array.isArray(data.answers) && data.answers.length) {
        // Legacy flat-answers payload: synthesize a single default set so the
        // rest of the app can treat everything as answer sets uniformly.
        const synthetic: AnswerSet = {
          id: 'default',
          title: 'Default',
          order: 0,
          answers: data.answers.map((answer, index) => normalizeAnswer(answer, 'teal', index)),
        }
        answerSets.value = [synthetic]
        selectedSetId.value = synthetic.id
      }
    } catch {
      // keep local fallback when content-api is unavailable
    } finally {
      loading.value = false
      hydrated.value = true
      persist()
    }
  }

  function replaceSet(updated: AnswerSet) {
    const normalized = normalizeSet(updated)
    const index = answerSets.value.findIndex(set => set.id === normalized.id)
    answerSets.value = index >= 0
      ? answerSets.value.map(set => set.id === normalized.id ? normalized : set)
      : [...answerSets.value, normalized]
  }

  async function createSet(input: AnswerSetInput) {
    const title = input.title.trim()
    if (!title) return
    const id = createUserID()
    const optimistic: AnswerSet = {
      id,
      title,
      color: input.color,
      order: answerSets.value.length,
      answers: [],
      ...(input.imageRef ? { imageRef: input.imageRef } : {}),
      ...(input.description ? { description: input.description } : {}),
    }
    replaceSet(optimistic)
    selectedSetId.value = id
    try {
      const saved = await api.createAnswerSet({ ...input, id, order: optimistic.order, title })
      if (saved) replaceSet(saved)
    } finally {
      persist()
    }
  }

  async function updateSet(id: string, input: AnswerSetInput) {
    const current = answerSets.value.find(set => set.id === id)
    if (!current) return
    replaceSet({
      ...current,
      ...input,
      title: input.title.trim() || current.title,
    })
    try {
      const saved = await api.updateAnswerSet(id, { ...input, title: input.title.trim() || current.title })
      if (saved) replaceSet(saved)
    } finally {
      persist()
    }
  }

  async function deleteSet(id: string) {
    answerSets.value = answerSets.value.filter(set => set.id !== id)
    if (selectedSetId.value === id) selectedSetId.value = answerSets.value[0]?.id ?? null
    try {
      await api.deleteAnswerSet(id)
    } finally {
      persist()
    }
  }

  function selectSet(id: string) {
    if (!answerSets.value.some(set => set.id === id)) return
    selectedSetId.value = id
    persist()
  }

  async function createTile(setId: string, input: AnswerTileInput) {
    const label = input.label.trim()
    if (!label) return
    const set = answerSets.value.find(item => item.id === setId)
    if (!set) return
    const optimistic: AnswerTile = {
      id: createUserID(),
      label,
      speech: input.speech.trim() || label,
      color: input.color,
      order: set.answers.length,
      ...(input.imageRef ? { imageRef: input.imageRef } : {}),
      ...(input.icon ? { icon: input.icon } : {}),
    }
    set.answers = [...set.answers, optimistic]
    answerSets.value = [...answerSets.value]
    try {
      const saved = await api.createAnswerTile(setId, { ...optimistic, order: optimistic.order ?? set.answers.length })
      if (saved) {
        set.answers = set.answers.map(tile => tile.id === optimistic.id ? { ...saved, order: optimistic.order } : tile)
        answerSets.value = [...answerSets.value]
      }
    } finally {
      persist()
    }
  }

  async function updateTile(setId: string, tileId: string, input: AnswerTileInput) {
    const set = answerSets.value.find(item => item.id === setId)
    if (!set) return
    set.answers = set.answers.map(tile => tile.id === tileId
      ? {
          ...tile,
          ...input,
          label: input.label.trim() || tile.label,
        }
      : tile)
    answerSets.value = [...answerSets.value]
    try {
      const saved = await api.updateAnswerTile(setId, tileId, input)
      if (saved) {
        set.answers = set.answers.map(tile => tile.id === tileId ? saved : tile)
        answerSets.value = [...answerSets.value]
      }
    } finally {
      persist()
    }
  }

  async function deleteTile(setId: string, tileId: string) {
    const set = answerSets.value.find(item => item.id === setId)
    if (!set) return
    set.answers = set.answers.filter(tile => tile.id !== tileId)
    answerSets.value = [...answerSets.value]
    try {
      await api.deleteAnswerTile(setId, tileId)
    } finally {
      persist()
    }
  }

  return {
    contentBaseUrl: api.baseUrl,
    answerSets,
    selectedSetId,
    selectedSet,
    loading,
    hydrated,
    loadContent,
    createSet,
    updateSet,
    deleteSet,
    selectSet,
    createTile,
    updateTile,
    deleteTile,
    persist,
  }
}

export function normalizeSet(set: AnswerSet): AnswerSet {
  const setColor = normalizeColor(set.color, 'teal')
  return {
    ...set,
    color: setColor,
    order: typeof set.order === 'number' ? set.order : 0,
    answers: (set.answers ?? []).map((answer, index) => normalizeAnswer(answer, setColor, index)),
  }
}

export function normalizeAnswer(answer: AnswerTile, fallbackColor: TikoColorName = 'teal', index = 0): AnswerTile {
  return {
    ...answer,
    speech: answer.speech || answer.label,
    color: normalizeColor(answer.color, fallbackColor),
    order: typeof answer.order === 'number' ? answer.order : index,
  }
}

export function isUserOwned(id: string) {
  return id.startsWith('user_')
}

export function colorValue(color: TikoColorName | undefined) {
  if (!color) return undefined
  return colorValueByName.get(color) ?? colorValueByName.get('teal')
}

export function fallbackColor(index: number): TikoColorName {
  return fallbackColors[index % fallbackColors.length]
}

export function tileImageSrc(tile: AnswerTile, contentBaseUrl: string) {
  return tile.imageRef ? tikoContentImageRefUrl(tile.imageRef, contentBaseUrl) : ''
}

function normalizeColor(value: unknown, fallback: TikoColorName): TikoColorName {
  if (typeof value === 'string') {
    if (colorNames.has(value as TikoColorName)) return value as TikoColorName
  }
  return fallback
}

function createUserID() {
  return `user_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`
}
