<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { TIKO_PALETTE, tikoColors, type TikoColorEntry } from '@tiko/ui'

const bemm = useBemm('color-swatch-picker', { return: 'string', includeBaseClass: true })

const props = defineProps<{
  modelValue: string
  colors?: string[]
  mode?: 'hex' | 'name'
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const palette = computed<TikoColorEntry[]>(() => {
  if (props.mode === 'name') return tikoColors
  return (props.colors ?? TIKO_PALETTE).map(hex => ({ name: hex, hex }))
})

function colorValue(color: TikoColorEntry) {
  return props.mode === 'name' ? color.name : color.hex
}
</script>

<template>
  <div :class="bemm('')">
    <button
      v-for="color in palette"
      :key="color.name"
      type="button"
      :class="bemm('dot', { active: modelValue === colorValue(color) })"
      :style="{ '--c': color.hex }"
      :title="color.name"
      @click="emit('update:modelValue', colorValue(color))"
    />
  </div>
</template>

<style lang="scss">
.color-swatch-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);

  &__dot {
    width: calc(var(--space) * 1.75);
    height: calc(var(--space) * 1.75);
    border-radius: var(--border-radius-round);
    background: var(--c);
    border: 3px solid transparent;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: transform 0.1s ease, border-color 0.1s ease, outline-color 0.1s ease;
    outline: 2px solid transparent;
    outline-offset: 2px;

    &:hover {
      transform: scale(1.2);
    }

    &--active {
      outline-color: var(--admin-text);
      transform: scale(1.2);
    }
  }
}
</style>
