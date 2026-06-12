<script setup lang="ts">
import { useBemm } from 'bemm'
import { computed } from 'vue'
import { tikoColors, type TikoColorName } from './tikoColors'

const props = withDefaults(defineProps<{
  modelValue: number | TikoColorName
  colors?: number[]
  valueMode?: 'number' | 'name'
  label?: string
}>(), {
  colors: () => [0xFF6B6B, 0xFF922B, 0xFFD43B, 0x51CF66, 0x22B8CF, 0x4D96FF, 0x845EF7, 0xF06595, 0x868E96, 0x343A40],
  valueMode: 'number',
  label: 'Color',
})

const emit = defineEmits<{
  'update:modelValue': [value: number | TikoColorName]
}>()

const bemm = useBemm('tiko-color-picker', { return: 'string', includeBaseClass: true })

const palette = computed(() => {
  if (props.valueMode === 'name') {
    return tikoColors.map(color => ({
      key: color.name,
      label: color.name,
      value: color.name,
      color: color.hex,
    }))
  }

  return props.colors.map(color => ({
    key: String(color),
    label: hexColor(color),
    value: color,
    color: hexColor(color),
  }))
})

function hexColor(value: number) {
  return `#${Math.max(0, value).toString(16).padStart(6, '0').slice(-6).toUpperCase()}`
}
</script>

<template>
  <div :class="bemm('')">
    <span v-if="label" :class="bemm('label')">{{ label }}</span>
    <div :class="bemm('swatches')">
      <button
        v-for="color in palette"
        :key="color.key"
        type="button"
        :class="bemm('swatch', { active: color.value === modelValue })"
        :style="{ backgroundColor: color.color }"
        :aria-label="color.label"
        :aria-pressed="color.value === modelValue ? 'true' : 'false'"
        @click="emit('update:modelValue', color.value)"
      />
    </div>
  </div>
</template>
