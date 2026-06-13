<script setup lang="ts" generic="T extends { id: string }">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import TikoEditBadge from './TikoEditBadge.vue'
import TikoPagedTileGrid from './TikoPagedTileGrid.vue'
import TikoSelectionBadge from './TikoSelectionBadge.vue'
import TikoSquareTile from './TikoSquareTile.vue'

const props = withDefaults(defineProps<{
  items: T[]
  columns: number
  itemsPerPage: number
  page: number
  reduceMotion?: boolean
  editing?: boolean
  labelSize?: 'small' | 'medium' | 'large'
  getTitle: (item: T) => string
  getBackground: (item: T) => string
  getImage?: (item: T) => string | string[] | undefined
  isSelected?: (item: T) => boolean
  isActive?: (item: T) => boolean
  canEdit?: (item: T) => boolean
  isUserOwned?: (item: T) => boolean
  labels?: {
    deselect?: string
    edit?: string
    select?: string
  }
}>(), {
  reduceMotion: false,
  editing: false,
  labelSize: 'medium',
  getImage: () => undefined,
  isSelected: () => false,
  isActive: () => false,
  canEdit: () => true,
  isUserOwned: () => false,
})

const emit = defineEmits<{
  'update:page': [page: number]
  activate: [item: T]
  edit: [item: T]
  select: [item: T]
  dragStart: [item: T]
  dropItem: [item: T]
  startEdit: []
}>()

const bemm = useBemm('tiko-tile-board', { return: 'string', includeBaseClass: true })

const pageModel = computed({
  get: () => props.page,
  set: value => emit('update:page', value),
})

function imageSources(item: T): string[] {
  const value = props.getImage(item)
  if (Array.isArray(value)) return value
  return value ? [value] : []
}
</script>

<template>
  <TikoPagedTileGrid
    v-model:page="pageModel"
    :items="items"
    :columns="columns"
    :items-per-page="itemsPerPage"
    :reduce-motion="reduceMotion"
  >
    <template #item="{ item }">
      <article
        :class="bemm('item', { editing, selected: isSelected(item) })"
        draggable="true"
        @dragstart="emit('dragStart', item)"
        @dragover.prevent
        @drop="emit('dropItem', item)"
        @contextmenu.prevent="emit('edit', item)"
        @dblclick="emit('startEdit')"
      >
        <TikoSquareTile
          :title="getTitle(item)"
          :background="getBackground(item)"
          :image-srcs="imageSources(item)"
          :active="isActive(item)"
          :editing="editing"
          :selected="isSelected(item)"
          :label-size="labelSize"
          @press="emit('activate', item)"
        />
        <TikoSelectionBadge
          v-if="editing"
          :selected="isSelected(item)"
          :select-label="labels?.select"
          :deselect-label="labels?.deselect"
          @toggle="emit('select', item)"
        />
        <TikoEditBadge
          v-if="editing && canEdit(item)"
          :user-owned="isUserOwned(item)"
          :edit-label="labels?.edit"
          @press="emit('edit', item)"
        />
      </article>
    </template>
  </TikoPagedTileGrid>
</template>
