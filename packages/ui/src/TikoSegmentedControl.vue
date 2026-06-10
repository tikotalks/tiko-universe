<script setup lang="ts">
import { useBemm } from 'bemm'

defineProps<{
  modelValue: number
  label: string
  options: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const bemm = useBemm('tiko-segmented-control', { return: 'string', includeBaseClass: true })
</script>

<template>
  <section :class="bemm('')">
    <h3 :class="bemm('label')">{{ label }}</h3>
    <div :class="bemm('items')">
      <button
        v-for="(option, index) in options"
        :key="option"
        type="button"
        :class="bemm('item', { active: index === modelValue })"
        @click="emit('update:modelValue', index)"
      >
        {{ option }}
      </button>
    </div>
  </section>
</template>
