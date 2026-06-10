<script setup lang="ts">
import { useBemm } from 'bemm'

withDefaults(defineProps<{
  title: string
  background: string
  imageSrc?: string
  active?: boolean
  editing?: boolean
  selected?: boolean
  labelSize?: 'small' | 'medium' | 'large'
}>(), {
  imageSrc: '',
  active: false,
  editing: false,
  selected: false,
  labelSize: 'medium',
})

const emit = defineEmits<{
  press: []
}>()

const bemm = useBemm('tiko-square-tile', { return: 'string', includeBaseClass: true })
</script>

<template>
  <button
    type="button"
    :class="bemm('', { active, editing, selected, [`label-${labelSize}`]: true })"
    :style="{ backgroundColor: background }"
    :aria-label="title"
    @click="emit('press')"
  >
    <img v-if="imageSrc" :class="bemm('image')" :src="imageSrc" :alt="title" loading="lazy">
    <span :class="bemm('label')">{{ title }}</span>
  </button>
</template>
