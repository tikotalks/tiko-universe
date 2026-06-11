import { ref, watch, computed, type ComputedRef } from 'vue'
import { tikoColors } from '@tiko/ui'
import type { RadioCategory, TikoColorName } from '@tiko/data'

const colorNames = new Set<TikoColorName>(tikoColors.map(color => color.name as TikoColorName))
const colorByHex = new Map<string, TikoColorName>(tikoColors.map(color => [color.hex.toLowerCase(), color.name as TikoColorName]))

function normalizeColor(value: unknown): TikoColorName {
  if (typeof value !== 'string') return 'red'
  const color = value.trim().toLowerCase()
  if (colorNames.has(color as TikoColorName)) return color as TikoColorName
  return colorByHex.get(color) ?? 'red'
}

function normalizeCategory(category: Partial<RadioCategory>, order = 0): RadioCategory {
  const name = typeof category.name === 'string' && category.name.trim() ? category.name : 'Category'
  return {
    id: typeof category.id === 'string' && category.id.trim() ? category.id : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    name,
    icon: typeof category.icon === 'string' && category.icon.trim() ? category.icon : 'media/headphones',
    color: normalizeColor(category.color),
    order: typeof category.order === 'number' ? category.order : order,
  }
}

export function useCategories(storageKey: string = 'tiko:radio:categories') {
  const categories = ref<RadioCategory[]>(loadCategories())

  function loadCategories(): RadioCategory[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) return (JSON.parse(raw) as Partial<RadioCategory>[]).map(normalizeCategory)
    } catch { /* ignore */ }
    return []
  }

  function saveCategories() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(categories.value))
  }

  const isEmpty: ComputedRef<boolean> = computed(() => categories.value.length === 0)

  const categoryNames: ComputedRef<Set<string>> = computed(() => new Set(categories.value.map(c => c.name)))

  function addCategory(category: Omit<RadioCategory, 'id' | 'order'>): RadioCategory {
    const id = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const maxOrder = categories.value.reduce((max, c) => Math.max(max, c.order), -1)
    const newCat: RadioCategory = normalizeCategory({ ...category, id, order: maxOrder + 1 }, maxOrder + 1)
    categories.value = [...categories.value, newCat]
    return newCat
  }

  function removeCategory(id: string) {
    categories.value = categories.value.filter(c => c.id !== id)
  }

  function updateCategory(id: string, updates: Partial<RadioCategory>) {
    categories.value = categories.value.map(c => c.id === id ? { ...c, ...updates } : c)
  }

  watch(categories, saveCategories, { deep: true })

  return {
    categories,
    isEmpty,
    categoryNames,
    addCategory,
    removeCategory,
    updateCategory,
  }
}
