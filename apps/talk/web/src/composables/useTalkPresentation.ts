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
      .slice(0, 50)
      .map((word, index) => {
        const category = normalizeCategoryId(word.category)
        const suggestionBoost = suggestionIds.has(word.id) ? 1 : 0
        const score = Math.max(0.12, 1 - index * 0.018 + suggestionBoost * 0.14)
        return {
          id: word.id,
          label: word.text,
          icon: wordIcon(word),
          color: presentationColor(category, index),
          category,
          weight: score > 0.82 ? 'high' : score > 0.55 ? 'medium' : 'low',
          score,
          word,
        }
      })
  })

  return { shortcuts, cloudWords }
}

function resolvePositions(
  nodes: VisualWordNode[],
  width: number,
  height: number,
): PositionedWordNode[] {
  if (!nodes.length) return []

  const centerX = width * 0.5
  const centerY = height * 0.6
  const radiusX = Math.max(80, width * 0.54)
  const radiusY = Math.max(80, height * 0.68)
  const count = nodes.length

  // Size: high-score words are larger. Range 44–102px for up to 50 words.
  function sizeFor(score: number) {
    return Math.round(44 + score * 58)
  }

  // Assign each word to a stable slot using its ID hash so the same word
  // always lands in a similar part of the cloud regardless of list order.
  // We still place by score-rank (index) but jitter angle by hash.
  const items = nodes.map((node, index) => {
    const score = Math.min(1, Math.max(0.12, node.score))
    const size = sizeFor(score)
    const hash = stableHash(node.id)
    // Golden-angle base angle + small hash-derived jitter per word
    const baseAngle = index * 2.399963229728653
    const jitter = ((hash % 64) - 32) / 64 * 0.6
    const angle = baseAngle + jitter
    // Spiral from near-center (index 0 = highest score) outward
    const rank = count <= 1 ? 0.5 : index / (count - 1)
    const ring = 0.06 + 0.88 * Math.sqrt(rank)
    const x = centerX + Math.cos(angle) * radiusX * ring
    const y = centerY + Math.sin(angle) * radiusY * ring
    return { node, x, y, size }
  })

  // Anti-overlap: push overlapping circles apart. Higher-priority (lower index)
  // words resist movement more; lower-priority words give way.
  for (let iter = 0; iter < 20; iter++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!
        const b = items[j]!
        const gap = 6
        const minDist = (a.size + b.size) / 2 + gap
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
        if (dist < minDist) {
          const push = (minDist - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          // Higher-index (lower score) items absorb more of the push
          const weightA = 0.32
          const weightB = 0.68
          a.x -= nx * push * weightA
          a.y -= ny * push * weightA
          b.x += nx * push * weightB
          b.y += ny * push * weightB
        }
      }
    }
  }

  return items.map(({ node, x, y, size }) => {
    const score = Math.min(1, Math.max(0.12, node.score))
    return {
      ...node,
      x: Math.round(x),
      y: Math.round(y),
      size,
      zIndex: Math.round(score * 100),
    }
  })
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
    return resolvePositions(nodes.value, width, height)
  })

  return { cloudEl, positionedNodes }
}
