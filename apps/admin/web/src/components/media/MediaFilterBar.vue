<script setup lang="ts">
import { computed, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputSearch, InputSelect } from '@sil/ui'
import type { FilterFacet } from './mediaTypes'

const props = withDefaults(defineProps<{
  categories?: FilterFacet[]
  tags?: FilterFacet[]
  types?: FilterFacet[]
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
  { label: 'All categories', value: '' },
  ...props.categories.map(facet => ({ label: `${labelFor(facet.value)} (${facet.count})`, value: facet.value })),
])

const tagOptions = computed(() => [
  { label: 'All tags', value: '' },
  ...props.tags.map(facet => ({ label: `${facet.value} (${facet.count})`, value: facet.value })),
])

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

    <InputSelect
      v-model="category"
      :class="bemm('select')"
      :options="categoryOptions"
      filterable
      aria-label="Category"
    />

    <InputSelect
      v-model="tag"
      :class="bemm('select')"
      :options="tagOptions"
      filterable
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
