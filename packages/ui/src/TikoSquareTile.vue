<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'

const props = withDefaults(defineProps<{
  title: string
  background: string
  imageSrc?: string
  imageSrcs?: string[]
  active?: boolean
  editing?: boolean
  selected?: boolean
  labelSize?: 'small' | 'medium' | 'large'
}>(), {
  imageSrc: '',
  imageSrcs: () => [],
  active: false,
  editing: false,
  selected: false,
  labelSize: 'medium',
})

const emit = defineEmits<{
  press: []
}>()

const bemm = useBemm('tiko-square-tile', { return: 'string', includeBaseClass: true })

const images = computed(() => {
  const sources = props.imageSrcs.length > 0 ? props.imageSrcs : props.imageSrc ? [props.imageSrc] : []
  return sources
    .map(source => source.trim())
    .filter(Boolean)
    .slice(0, 9)
})
</script>

<template>
  <button
    type="button"
    :class="bemm('', { active, editing, selected, [`label-${labelSize}`]: true })"
    :style="{ backgroundColor: background }"
    :aria-label="title"
    @click="emit('press')"
  >
    <div
      v-if="images.length > 0"
      :class="bemm('image-grid', { [`count-${images.length}`]: true })"
      aria-hidden="true"
    >
      <span v-for="(src, index) in images" :key="`${src}-${index}`" :class="bemm('image-cell')">
        <img :class="bemm('image')" :src="src" alt="" loading="lazy">
      </span>
    </div>
    <span :class="bemm('label')">{{ title }}</span>
  </button>
</template>
