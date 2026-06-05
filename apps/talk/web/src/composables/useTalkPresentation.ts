import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import type { Category, WordTile } from '@tiko/talk-types'

type CloudWeight = 'high' | 'medium' | 'low'

export interface VisualWordNode {
  id: string
  label: string
  icon: string
  color: string
  category: string
  weight: CloudWeight
  score: number
  word: WordTile
}

export interface PositionedWordNode extends VisualWordNode {
  x: number
  y: number
  size: number
  zIndex: number
}

export interface CategoryShortcut {
  id: string
  label: string
  icon: string
  color: string
  source: Category
}

const palette = ['yellow', 'mint', 'lavender', 'peach', 'blue', 'green', 'pink'] as const
const categoryIconFallbacks = [
  'ui/talk',
  'ui/talk-heart',
  'food-drinks/bottle',
  'wayfinding/map3',
  'animals/cat-head',
  'ui/color-pallette',
  'wayfinding/car',
] as const

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

export function normalizeCategoryId(category: string) {
  return category.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'words'
}

export function presentationColor(id: string, index = 0) {
  return palette[(stableHash(id) + index) % palette.length]
}

function fallbackIcon(id: string, index = 0) {
  return categoryIconFallbacks[(stableHash(id) + index) % categoryIconFallbacks.length]
}

export function wordIcon(word: WordTile) {
  return word.icon?.includes('/') ? word.icon : ''
}

export function categoryIcon(category: Category, index = 0) {
  return category.icon?.includes('/') ? category.icon : fallbackIcon(category.id || category.label || 'words', index)
}

export function toShortcut(category: Category, index = 0): CategoryShortcut {
  const id = normalizeCategoryId(category.id || category.label)
  return {
    id,
    label: category.label || id,
    icon: categoryIcon(category, index),
    color: presentationColor(id, index),
    source: category,
  }
}

export function useTalkPresentation(options: {
  words: Ref<WordTile[]>
  suggestions: Ref<WordTile[]>
  categories: Ref<Category[]>
  selectedWordIds: Ref<string[]>
}) {
  const shortcuts = computed(() => options.categories.value.map((category, index) => toShortcut(category, index)))

  const cloudWords = computed<VisualWordNode[]>(() => {
    const selected = new Set(options.selectedWordIds.value)
    const suggestionIds = new Set(options.suggestions.value.map((word) => word.id))
    const source = options.suggestions.value.length ? options.suggestions.value : options.words.value

    return source
      .filter((word) => !selected.has(word.id))
      .slice(0, 18)
      .map((word, index) => {
        const category = normalizeCategoryId(word.category)
        const suggestionBoost = suggestionIds.has(word.id) ? 1 : 0
        const score = Math.max(0.18, 1 - index * 0.045 + suggestionBoost * 0.18)
        return {
          id: word.id,
          label: word.text,
          icon: wordIcon(word),
          color: presentationColor(category, index),
          category,
          weight: score > 0.86 ? 'high' : score > 0.62 ? 'medium' : 'low',
          score,
          word,
        }
      })
  })

  return { shortcuts, cloudWords }
}

export function useWordCloudLayout(nodes: Ref<VisualWordNode[]>) {
  const cloudEl = ref<HTMLElement | null>(null)
  const bounds = ref({ width: 0, height: 0 })
  let observer: ResizeObserver | null = null

  onMounted(() => {
    if (!cloudEl.value || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect
      bounds.value = { width: rect.width, height: rect.height }
    })
    observer.observe(cloudEl.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  const positionedNodes = computed<PositionedWordNode[]>(() => {
    const width = Math.max(bounds.value.width, 320)
    const height = Math.max(bounds.value.height, 320)
    const centerX = width / 2
    const centerY = height / 2
    const radiusX = Math.max(80, width * 0.42)
    const radiusY = Math.max(80, height * 0.36)
    const count = Math.max(nodes.value.length, 1)

    return nodes.value.map((node, index) => {
      const rank = count === 1 ? 0 : index / (count - 1)
      const hash = stableHash(node.id)
      const angle = index * 2.399963229728653 + (hash % 360) * Math.PI / 1800
      const ring = Math.sqrt(rank) * (0.28 + (hash % 100) / 250)
      const score = Math.min(1, Math.max(0.18, node.score))
      const size = Math.round(82 + score * 72)
      const wobbleX = ((hash % 41) - 20) / 100
      const wobbleY = (((hash >> 8) % 41) - 20) / 100
      const x = Math.round(centerX + Math.cos(angle) * radiusX * ring + radiusX * wobbleX * 0.12)
      const y = Math.round(centerY + Math.sin(angle) * radiusY * ring + radiusY * wobbleY * 0.12)

      return {
        ...node,
        x: Math.min(width - size / 2, Math.max(size / 2, x)),
        y: Math.min(height - size / 2, Math.max(size / 2, y)),
        size,
        zIndex: Math.round(score * 100),
      }
    })
  })

  return { cloudEl, positionedNodes }
}
