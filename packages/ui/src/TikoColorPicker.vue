<script setup lang="ts">
import { useBemm } from 'bemm'

withDefaults(defineProps<{
  modelValue: number
  colors?: number[]
  label?: string
}>(), {
  colors: () => [0xFF6B6B, 0xFF922B, 0xFFD43B, 0x51CF66, 0x22B8CF, 0x4D96FF, 0x845EF7, 0xF06595, 0x868E96, 0x343A40],
  label: 'Color',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const bemm = useBemm('tiko-color-picker', { return: 'string', includeBaseClass: true })

function hexColor(value: number) {
  return `#${Math.max(0, value).toString(16).padStart(6, '0').slice(-6).toUpperCase()}`
}
</script>

<template>
  <div :class="bemm('')">
    <span v-if="label" :class="bemm('label')">{{ label }}</span>
    <div :class="bemm('swatches')">
      <button
        v-for="color in colors"
        :key="color"
        type="button"
        :class="bemm('swatch', { active: color === modelValue })"
        :style="{ backgroundColor: hexColor(color) }"
        :aria-label="hexColor(color)"
        @click="emit('update:modelValue', color)"
      />
    </div>
  </div>
</template>
