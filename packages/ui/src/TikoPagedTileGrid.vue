<script setup lang="ts" generic="T extends { id: string }">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'

const props = withDefaults(defineProps<{
  items: T[]
  columns: number
  itemsPerPage: number
  reduceMotion?: boolean
  pageLabel?: string
}>(), {
  reduceMotion: false,
  pageLabel: 'Page',
})

const emit = defineEmits<{
  pageChange: [page: number]
}>()

const currentPage = defineModel<number>('page', { default: 0 })
const bemm = useBemm('tiko-paged-tile-grid', { return: 'string', includeBaseClass: true })
const rootEl = ref<HTMLElement | null>(null)
const pagerWidth = ref(typeof window === 'undefined' ? 390 : window.innerWidth)
const touchStartX = ref(0)
const touchDeltaX = ref(0)
const isDragging = ref(false)
const activePointerId = ref<number | null>(null)

const pages = computed(() => {
  const pageSize = Math.max(1, props.itemsPerPage)
  const chunks: T[][] = []
  for (let i = 0; i < props.items.length; i += pageSize) chunks.push(props.items.slice(i, i + pageSize))
  return chunks.length ? chunks : [[]]
})

const totalPages = computed(() => Math.max(1, pages.value.length))
const pageOffset = computed(() => {
  const base = -currentPage.value * pagerWidth.value
  return isDragging.value ? base + touchDeltaX.value : base
})

let resizeObserver: ResizeObserver | undefined

function updatePagerWidth() {
  pagerWidth.value = rootEl.value?.clientWidth || window.innerWidth
}

function onPointerDown(event: PointerEvent) {
  updatePagerWidth()
  activePointerId.value = event.pointerId
  touchStartX.value = event.clientX
  touchDeltaX.value = 0
  isDragging.value = false
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return
  if (event.pointerType === 'mouse' && event.buttons !== 1) return
  const dx = event.clientX - touchStartX.value
  if (!isDragging.value && Math.abs(dx) > 5) isDragging.value = true
  if (!isDragging.value) return
  event.preventDefault()
  touchDeltaX.value = (currentPage.value <= 0 && dx > 0) || (currentPage.value >= totalPages.value - 1 && dx < 0) ? dx * 0.3 : dx
}

function onPointerUp(event?: PointerEvent) {
  if (event && activePointerId.value !== event.pointerId) return
  activePointerId.value = null
  if (!isDragging.value) return
  const threshold = pagerWidth.value * 0.2
  if (touchDeltaX.value < -threshold && currentPage.value < totalPages.value - 1) currentPage.value += 1
  if (touchDeltaX.value > threshold && currentPage.value > 0) currentPage.value -= 1
  isDragging.value = false
  touchDeltaX.value = 0
}

watch(totalPages, total => {
  if (currentPage.value > total - 1) currentPage.value = total - 1
})

watch(currentPage, page => emit('pageChange', page))

onMounted(() => {
  nextTick(updatePagerWidth)
  window.addEventListener('resize', updatePagerWidth)
  if (rootEl.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updatePagerWidth)
    resizeObserver.observe(rootEl.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePagerWidth)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="rootEl"
    :class="bemm('')"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div
      :class="bemm('track', { dragging: isDragging, 'reduce-motion': reduceMotion })"
      :style="{ transform: `translateX(${pageOffset}px)`, width: `${pagerWidth * pages.length}px` }"
    >
      <div
        v-for="(pageItems, pageIndex) in pages"
        :key="pageIndex"
        :class="bemm('page', { [`cols-${columns}`]: true })"
        :style="{ width: `${pagerWidth}px`, minWidth: `${pagerWidth}px` }"
      >
        <slot name="item" v-for="item in pageItems" :key="item.id" :item="item" />
      </div>
    </div>

    <div v-if="totalPages > 1" :class="bemm('dots')">
      <button
        v-for="page in totalPages"
        :key="page"
        type="button"
        :class="bemm('dot', { active: page - 1 === currentPage })"
        :aria-label="`${pageLabel} ${page}`"
        @click="currentPage = page - 1"
      />
    </div>
  </div>
</template>
