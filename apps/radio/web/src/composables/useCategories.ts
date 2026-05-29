import { ref, watch, computed, type ComputedRef } from 'vue'
import type { RadioCategory } from '@tiko/data'

const DEFAULT_CATEGORIES: RadioCategory[] = [
  { id: 'animals', name: 'Animals', icon: '🐾', color: '#FFD93D', order: 0 },
  { id: 'stories', name: 'Stories', icon: '📖', color: '#C3AED6', order: 1 },
  { id: 'bedtime', name: 'Bedtime', icon: '🌙', color: '#A8D8EA', order: 2 },
  { id: 'songs', name: 'Songs', icon: '🎵', color: '#FFB3C1', order: 3 },
]

export function useCategories(storageKey: string = 'tiko:radio:categories') {
  const categories = ref<RadioCategory[]>(loadCategories())

  function loadCategories(): RadioCategory[] {
    if (typeof window === 'undefined') return [...DEFAULT_CATEGORIES]
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return [...DEFAULT_CATEGORIES]
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
    const newCat: RadioCategory = { ...category, id, order: maxOrder + 1 }
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
