<script setup lang="ts">
import { computed, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputCustomSelect, InputSearch, InputSelect } from '@sil/ui'
import type { FacetMeta, FilterFacet } from './mediaTypes'

const props = withDefaults(defineProps<{
  categories?: FilterFacet[]
  tags?: FilterFacet[]
  types?: FilterFacet[]
  /** How much of each list the API returned, so a capped list can say so. */
  categoryMeta?: FacetMeta
  tagMeta?: FacetMeta
  /** Show the media-type select. Off for surfaces that only hold images. */
  showType?: boolean
  /** Show the active/inactive/hidden select. Only the media library has those states. */
  showState?: boolean
  loading?: boolean
  total?: number
  /** How long to wait after the last keystroke before searching. */
  debounceMs?: number
}>(), {
  categories: () => [],
  tags: () => [],
  types: () => [],
  categoryMeta: undefined,
  tagMeta: undefined,
  showType: false,
  showState: false,
  loading: false,
  total: undefined,
  debounceMs: 300,
})

const emit = defineEmits<{ (event: 'apply'): void }>()

const search = defineModel<string>('search', { default: '' })
const type = defineModel<string>('type', { default: '' })
const category = defineModel<string>('category', { default: '' })
const tag = defineModel<string>('tag', { default: '' })
const state = defineModel<string>('state', { default: '' })

const bemm = useBemm('media-filters', { return: 'string', includeBaseClass: true })

const typeOptions = computed(() => [
  { label: 'All types', value: '' },
  ...(props.types.length
    ? props.types.map(facet => ({ label: `${labelFor(facet.value)} (${facet.count})`, value: facet.value }))
    : [
        { label: 'Images', value: 'image' },
        { label: 'Audio', value: 'audio' },
        { label: 'Video', value: 'video' },
      ]),
])

const categoryOptions = computed(() => [
  { label: 'All categories', value: '', isNull: true },
  ...props.categories.map(facet => ({ label: `${labelFor(facet.value)} (${facet.count})`, value: facet.value })),
])

const tagOptions = computed(() => [
  { label: 'All tags', value: '', isNull: true },
  ...props.tags.map(facet => ({ label: `${facet.value} (${facet.count})`, value: facet.value })),
])

// The suggestion lists are capped server-side, so a value can be real without
// being offered. Say so, and let the field take a typed value either way.
const truncationNotice = computed(() => {
  const parts: string[] = []
  if (props.categoryMeta?.truncated) {
    parts.push(`${props.categoryMeta.returned} of ${props.categoryMeta.total} categories`)
  }
  if (props.tagMeta?.truncated) {
    parts.push(`${props.tagMeta.returned} of ${props.tagMeta.total} tags`)
  }
  if (!parts.length) return ''
  return `Suggesting the most-used ${parts.join(' and ')} — type any other value to filter by it.`
})

const stateOptions = [
  { label: 'Any state', value: '' },
  { label: 'Active only', value: 'active' },
  { label: 'Inactive only', value: 'inactive' },
  { label: 'Hidden only', value: 'hidden' },
]

const hasFilters = computed(() =>
  Boolean(search.value || type.value || category.value || tag.value || state.value))

function labelFor(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// Typing shouldn't fire a request per keystroke, but it also shouldn't need a
// button press. Every change schedules a single apply; because the watchers all
// run in the same flush, clearing a change of several fields at once still costs
// exactly one request.
let applyTimer: ReturnType<typeof setTimeout> | undefined

function scheduleApply(delay: number) {
  clearTimeout(applyTimer)
  applyTimer = setTimeout(() => emit('apply'), delay)
}

watch(search, () => scheduleApply(props.debounceMs))
watch([type, category, tag, state], () => scheduleApply(0))

function applyNow() {
  clearTimeout(applyTimer)
  emit('apply')
}

function clearAll() {
  search.value = ''
  type.value = ''
  category.value = ''
  tag.value = ''
  state.value = ''
}
</script>

<template>
  <div :class="bemm('')">
    <div :class="bemm('search')">
      <InputSearch
        v-model="search"
        placeholder="Search title, description, tags…"
        :search-action="applyNow"
        @search="applyNow"
      />
    </div>

    <InputSelect
      v-if="showType"
      v-model="type"
      :class="bemm('select')"
      :options="typeOptions"
      aria-label="Media type"
    />

    <InputCustomSelect
      v-model="category"
      :class="bemm('select')"
      :options="categoryOptions"
      searchable
      allow-custom
      placeholder="All categories"
      aria-label="Category"
    />

    <InputCustomSelect
      v-model="tag"
      :class="bemm('select')"
      :options="tagOptions"
      searchable
      allow-custom
      placeholder="All tags"
      aria-label="Tag"
    />

    <InputSelect
      v-if="showState"
      v-model="state"
      :class="bemm('select')"
      :options="stateOptions"
      aria-label="State"
    />

    <span v-if="total !== undefined" :class="bemm('count')">
      {{ loading ? 'Searching…' : `${total} result${total === 1 ? '' : 's'}` }}
    </span>

    <Button v-if="hasFilters" variant="ghost" size="small" @click="clearAll">Clear</Button>

    <p v-if="truncationNotice" :class="bemm('notice')">{{ truncationNotice }}</p>
  </div>
</template>

<style lang="scss">
.media-filters {
  display: flex;
  gap: var(--space-s);
  align-items: center;
  flex-wrap: wrap;
  background: var(--admin-surface);
  border-radius: var(--border-radius-m);
  padding: var(--space-s) var(--space-m);

  &__search {
    flex: 1 1 240px;
    min-width: 0;
  }

  &__select {
    flex: 0 1 180px;
    min-width: 140px;
  }

  &__count {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    white-space: nowrap;
    margin-left: auto;
  }

  &__notice {
    flex: 1 0 100%;
    color: var(--admin-text-dim);
    font-size: var(--font-size-xs);
    margin: 0;
  }

  @media (max-width: 860px) {
    &__search,
    &__select {
      flex: 1 1 100%;
    }

    &__count {
      margin-left: 0;
    }
  }
}
</style>
