<script setup lang="ts">
import { useBemm } from 'bemm'

defineProps<{
  modelValue: boolean
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const bemm = useBemm('tiko-toggle-row', { return: 'string', includeBaseClass: true })
</script>

<template>
  <label :class="bemm('')">
    <span :class="bemm('label')">{{ label }}</span>
    <input
      :class="bemm('control')"
      type="checkbox"
      :checked="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >
  </label>
</template>
