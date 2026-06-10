<script setup lang="ts">
import { useBemm } from 'bemm'

withDefaults(defineProps<{
  modelValue: string
  label: string
  placeholder?: string
  multiline?: boolean
}>(), {
  placeholder: '',
  multiline: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const bemm = useBemm('tiko-field', { return: 'string', includeBaseClass: true })
</script>

<template>
  <label :class="bemm('')">
    <span :class="bemm('label')">{{ label }}</span>
    <textarea
      v-if="multiline"
      :class="bemm('control', { multiline: true })"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      :class="bemm('control')"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </label>
</template>
